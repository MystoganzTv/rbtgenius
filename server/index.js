import express from "express";
import {
  computeProgress,
  evaluateQuestionAnswer,
  getQuestionBank,
  readDb,
  sanitizeQuestions,
  TOTAL_PRACTICE_QUESTIONS,
  updateDb,
  writeDb,
} from "./lib/store.js";
import {
  buildSession,
  hashPassword,
  isSessionExpired,
  shouldRotateSession,
  verifyPassword,
} from "./lib/auth.js";
import {
  checkRateLimit,
  clearRateLimit,
  recordRateLimitAttempt,
} from "./lib/rate-limit.js";
import {
  buildOAuthAuthorizationUrl,
  createOAuthState,
  exchangeOAuthCodeForProfile,
  listOAuthProviders,
  normalizeOrigin,
  normalizeRedirectPath,
} from "./lib/oauth.js";
import { resolveUserRole } from "./lib/seed.js";
import {
  confirmStripeCheckoutSession,
  constructStripeWebhookEvent,
  createStripeCheckoutSession,
  createStripePortalSession,
  getBillingConfig,
} from "./lib/billing.js";
import {
  applyStripeWebhookEvent,
  findUserForBilling,
  syncConfirmedCheckout,
} from "./lib/stripe-sync.js";
import {
  notifyNewMember,
  notifyNewSubscription,
} from "./lib/admin-notify.js";
import {
  PLAN_IDS,
  countTutorMessagesToday,
  getEntitlements,
  isPremiumPlan,
} from "../src/lib/plan-access.js";
import { topicLabels } from "../src/lib/question-bank.js";
import {
  createTutorReply,
  isOpenAIConfigured,
  streamTutorReplyOpenAI,
} from "./lib/tutor.js";

const app = express();
// Trust the first proxy hop so req.ip reflects the real client IP when running
// behind Netlify / Heroku / Render / nginx. Safe default for a single proxy.
app.set("trust proxy", 1);
const port = Number(process.env.API_PORT || 8787);

function getClientIp(req) {
  // Express already does the X-Forwarded-For dance when trust proxy is set.
  // Fallback to a literal "unknown" so missing IP can't accidentally collapse
  // every attacker into one bucket.
  return req.ip || req.connection?.remoteAddress || "unknown";
}

function sendRateLimited(res, decision, feature) {
  res.setHeader("Retry-After", String(decision.retryAfterSeconds));
  res.status(429).json({
    message: "Too many attempts. Please wait and try again.",
    code: "rate_limited",
    feature,
    retry_after_seconds: decision.retryAfterSeconds,
  });
}

app.post("/api/billing/webhook", express.raw({ type: "application/json" }), (req, res) => {
  try {
    const event = constructStripeWebhookEvent(
      req.body,
      req.headers["stripe-signature"],
    );

    const current = readDb();
    if (current.stripeEvents?.[event.id]) {
      res.json({ received: true, duplicate: true });
      return;
    }

    const next = applyStripeWebhookEvent(current, event, createId);
    const eventObject = event.data?.object || {};
    writeDb(next);

    if (event.type === "checkout.session.completed") {
      const user = findUserForBilling(next, {
        userId: eventObject.client_reference_id,
        customerId:
          typeof eventObject.customer === "string"
            ? eventObject.customer
            : eventObject.customer?.id,
        subscriptionId:
          typeof eventObject.subscription === "string"
            ? eventObject.subscription
            : eventObject.subscription?.id,
        email: eventObject.customer_email || eventObject.customer_details?.email,
      });

      if (user) {
        void notifyNewSubscription({
          user,
          plan: eventObject.metadata?.plan || user.plan,
          checkout: eventObject,
        });
      }
    }

    res.json({ received: true });
  } catch (error) {
    res.status(400).json({ message: error.message || "Invalid Stripe webhook event" });
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  // Expose the rotation header so the browser can read it from cross-origin responses.
  res.setHeader(
    "Access-Control-Expose-Headers",
    "X-New-Auth-Token, X-Auth-Token-Expires-At",
  );

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
});

function getToken(req) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length);
}

function getCurrentUser(req) {
  const token = getToken(req);
  if (!token) {
    return null;
  }

  const db = readDb();
  const user = db.users.find((entry) => entry.token === token) || null;
  if (!user) return null;
  if (isSessionExpired(user)) return null;
  return user;
}

function rotateSessionIfNeeded(req, res, user) {
  if (!user || !shouldRotateSession(user)) return user;

  const session = buildSession();
  let rotatedUser = user;
  updateDb((current) => ({
    ...current,
    users: current.users.map((entry) => {
      if (entry.id !== user.id) return entry;
      rotatedUser = {
        ...entry,
        token: session.token,
        token_issued_at: session.issued_at,
        token_expires_at: session.expires_at,
      };
      return rotatedUser;
    }),
  }));

  res.setHeader("X-New-Auth-Token", session.token);
  res.setHeader("X-Auth-Token-Expires-At", session.expires_at);
  return rotatedUser;
}

function requireUser(req, res, next) {
  const user = getCurrentUser(req);

  if (!user) {
    res.status(401).json({
      message: "Authentication required",
      extra_data: { reason: "auth_required" },
    });
    return;
  }

  req.currentUser = rotateSessionIfNeeded(req, res, user);
  next();
}

function requireAdmin(req, res, next) {
  requireUser(req, res, () => {
    if (req.currentUser?.role !== "admin") {
      res.status(403).json({ message: "Admin access required" });
      return;
    }

    next();
  });
}

function applyQuestionFilters(questions, query) {
  const topic = query.topic || "all";
  const difficulty = query.difficulty || "all";
  const limit = Number(query.limit || 0);
  const offset = Math.max(0, Number(query.offset || 0));

  const filtered = questions.filter((question) => {
    const topicMatch = topic === "all" || question.topic === topic;
    const difficultyMatch = difficulty === "all" || question.difficulty === difficulty;
    return topicMatch && difficultyMatch;
  });

  if (limit > 0) {
    return filtered.slice(offset, offset + limit);
  }

  return offset > 0 ? filtered.slice(offset) : filtered;
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getBackendOrigin(req) {
  return `${req.protocol}://${req.get("host")}`;
}

function createSafeUser(user) {
  const { password_hash: _passwordHash, password_salt: _passwordSalt, ...safeUser } = user;
  return safeUser;
}

function buildUserAccessState(db, user) {
  const progress = computeProgress(db, user.id);
  const tutorMessagesToday = countTutorMessagesToday(db.tutorConversations[user.id] || []);
  const entitlements = getEntitlements(user.plan, {
    practiceQuestionsToday: progress.questions_today,
    tutorMessagesToday,
  });

  return {
    progress,
    entitlements,
    billing: getBillingConfig(user),
  };
}

function getSeenPracticeQuestionIds(db, userId) {
  return [
    ...new Set(
      db.attempts
        .filter(
          (attempt) =>
            attempt.user_id === userId && (!attempt.source || attempt.source === "practice"),
        )
        .map((attempt) => attempt.question_id)
        .filter(Boolean),
    ),
  ];
}

function getSeenMockQuestionIds(db, userId) {
  return [
    ...new Set(
      db.mockExams
        .filter((exam) => exam.user_id === userId)
        .flatMap((exam) => exam.answers || [])
        .map((answer) => answer.question_id)
        .filter(Boolean),
    ),
  ];
}

function buildProfilePayload(db, user) {
  const { progress, entitlements, billing } = buildUserAccessState(db, user);

  return {
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      plan: user.plan,
      stripe_customer_id: user.stripe_customer_id || null,
    },
    progress,
    entitlements,
    billing,
    payments: db.payments.filter((payment) => payment.user_id === user.id),
  };
}

function sendPremiumRequired(res, feature) {
  res.status(403).json({
    message: "Premium membership required",
    code: "premium_required",
    feature,
  });
}

function sendPlanLimitReached(res, feature, limit, remaining) {
  res.status(403).json({
    message: "Daily plan limit reached",
    code: "plan_limit_reached",
    feature,
    limit,
    remaining,
  });
}

function getCheckoutOrigin(req) {
  const originHeader = req.body?.origin || req.headers.origin;
  return normalizeOrigin(originHeader, getBackendOrigin(req));
}

function pruneOAuthStates(states = {}) {
  const now = Date.now();
  return Object.fromEntries(
    Object.entries(states).filter(([, value]) => {
      const createdAt = new Date(value?.created_at || 0).getTime();
      return Number.isFinite(createdAt) && now - createdAt < 1000 * 60 * 15;
    }),
  );
}

function consumeOAuthState(stateId) {
  let stateRecord = null;

  updateDb((current) => {
    const nextStates = pruneOAuthStates(current.oauthStates);
    stateRecord = nextStates[stateId] || null;
    delete nextStates[stateId];

    return {
      ...current,
      oauthStates: nextStates,
    };
  });

  return stateRecord;
}

function buildFrontendLoginRedirect(frontendOrigin, redirectTo, params = {}) {
  const url = new URL("/login", frontendOrigin);
  if (redirectTo) {
    url.searchParams.set("redirectTo", normalizeRedirectPath(redirectTo));
  }

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

function upsertOAuthUser(profile, providerId) {
  let safeUser = null;
  let session = null;
  let wasCreated = false;

  updateDb((current) => {
    const existingUser = current.users.find(
      (user) => user.email.toLowerCase() === profile.email.toLowerCase(),
    );

    session = buildSession();
    const nextUsers = existingUser
      ? current.users.map((user) => {
          if (user.id !== existingUser.id) {
            return user;
          }

          const updatedUser = {
            ...user,
            full_name: user.full_name || profile.name,
            token: session.token,
            token_issued_at: session.issued_at,
            token_expires_at: session.expires_at,
            created_at: user.created_at || new Date().toISOString(),
            role: resolveUserRole(user.email, user.role || "student"),
            auth_provider: user.auth_provider || providerId,
            oauth_accounts: {
              ...(user.oauth_accounts || {}),
              [providerId]: {
                id: profile.id,
                email: profile.email,
                linked_at: new Date().toISOString(),
              },
            },
          };
          safeUser = createSafeUser(updatedUser);
          return updatedUser;
        })
      : [
          ...current.users,
          {
            id: createId("user"),
            full_name: profile.name,
            email: profile.email,
            created_at: new Date().toISOString(),
            role: resolveUserRole(profile.email),
            plan: "free",
            token: session.token,
            token_issued_at: session.issued_at,
            token_expires_at: session.expires_at,
            auth_provider: providerId,
            oauth_accounts: {
              [providerId]: {
                id: profile.id,
                email: profile.email,
                linked_at: new Date().toISOString(),
              },
            },
          },
        ];

    if (!safeUser) {
      const createdUser = nextUsers[nextUsers.length - 1];
      wasCreated = true;
      safeUser = createSafeUser(createdUser);
    }

    return {
      ...current,
      users: nextUsers,
    };
  });

  return { token: session.token, expires_at: session.expires_at, user: safeUser, created: wasCreated };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/public-settings", (_req, res) => {
  res.json({
    auth_required: true,
    app_name: "RBT Genius",
    billing: getBillingConfig(),
  });
});

app.get("/api/auth/providers", (_req, res) => {
  res.json({
    providers: listOAuthProviders(),
  });
});

app.get("/api/auth/oauth/:providerId/start", (req, res) => {
  const { providerId } = req.params;
  const redirectTo = normalizeRedirectPath(req.query.redirectTo);
  const backendOrigin = getBackendOrigin(req);
  const frontendOrigin = normalizeOrigin(req.query.origin, backendOrigin);
  const state = createOAuthState();

  try {
    updateDb((current) => ({
      ...current,
      oauthStates: {
        ...pruneOAuthStates(current.oauthStates),
        [state]: {
          provider_id: providerId,
          frontend_origin: frontendOrigin,
          redirect_to: redirectTo,
          created_at: new Date().toISOString(),
        },
      },
    }));

    const authorizationUrl = buildOAuthAuthorizationUrl({
      providerId,
      state,
      backendOrigin,
    });

    res.redirect(authorizationUrl);
  } catch (error) {
    res.redirect(
      buildFrontendLoginRedirect(frontendOrigin, redirectTo, {
        oauthError: error.message || "Unable to start sign-in",
      }),
    );
  }
});

async function handleOAuthCallback(req, res) {
  const { providerId } = req.params;
  const callbackState = String((req.body?.state || req.query.state) || "");
  const stateRecord = consumeOAuthState(callbackState);
  const fallbackOrigin = getBackendOrigin(req);
  const frontendOrigin = stateRecord?.frontend_origin || fallbackOrigin;
  const redirectTo = stateRecord?.redirect_to || "/";

  if (!stateRecord || stateRecord.provider_id !== providerId) {
    res.redirect(
      buildFrontendLoginRedirect(frontendOrigin, redirectTo, {
        oauthError: "Your sign-in session expired. Please try again.",
      }),
    );
    return;
  }

  if (req.body?.error || req.query.error) {
    res.redirect(
      buildFrontendLoginRedirect(frontendOrigin, redirectTo, {
        oauthError: String(
          req.body?.error_description ||
            req.query.error_description ||
            req.body?.error ||
            req.query.error,
        ),
      }),
    );
    return;
  }

  try {
    const profile = await exchangeOAuthCodeForProfile({
      providerId,
      code: String((req.body?.code || req.query.code) || ""),
      backendOrigin: fallbackOrigin,
      callbackParams: {
        ...req.query,
        ...req.body,
      },
    });
    const authData = upsertOAuthUser(profile, providerId);
    if (authData.created) {
      void notifyNewMember(authData.user, {
        source: "oauth",
        authProvider: providerId,
      });
    }

    res.redirect(
      buildFrontendLoginRedirect(frontendOrigin, redirectTo, {
        authToken: authData.token,
      }),
    );
  } catch (error) {
    res.redirect(
      buildFrontendLoginRedirect(frontendOrigin, redirectTo, {
        oauthError: error.message || "Unable to complete sign-in",
      }),
    );
  }
}

app.get("/api/auth/oauth/:providerId/callback", handleOAuthCallback);
app.post("/api/auth/oauth/:providerId/callback", handleOAuthCallback);

// Native mobile Google Sign-In: accepts the idToken from @react-native-google-signin/google-signin
app.post("/api/auth/google", async (req, res) => {
  const idToken = String(req.body?.id_token || "").trim();
  if (!idToken) {
    res.status(400).json({ message: "id_token is required" });
    return;
  }

  try {
    const tokenRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      res.status(401).json({ message: "Invalid Google token" });
      return;
    }

    const ALLOWED_AUDIENCES = [
      "37632251231-4l1t8mg15isp9ck5uvcpelrv5uvj2o66.apps.googleusercontent.com",
      "37632251231-th4qu526qnm34f3uitq7m363dolsu1f0.apps.googleusercontent.com",
    ];
    if (!ALLOWED_AUDIENCES.includes(tokenData.aud)) {
      res.status(401).json({ message: "Token audience mismatch" });
      return;
    }

    const profile = {
      id: tokenData.sub,
      email: String(tokenData.email || "").trim().toLowerCase(),
      name: tokenData.name || tokenData.email,
    };

    if (!profile.email) {
      res.status(401).json({ message: "Google did not return an email address" });
      return;
    }

    const authData = upsertOAuthUser(profile, "google");
    res.json({ token: authData.token, user: authData.user });
  } catch (err) {
    res.status(500).json({ message: err.message || "Google sign-in failed" });
  }
});

app.post("/api/auth/register", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const fullName = String(req.body?.full_name || "").trim();
  const ip = getClientIp(req);

  // Rate-limit registration before any processing so we don't even read the DB
  // if an IP is hammering us.
  const initialDb = readDb();
  const registerCheck = checkRateLimit(initialDb, "register", [ip]);
  if (!registerCheck.allowed) {
    sendRateLimited(res, registerCheck, "register");
    return;
  }

  if (!email || !password || !fullName) {
    // Count this as an attempt — otherwise an attacker can probe forever with
    // empty bodies without using up their quota.
    updateDb((current) => recordRateLimitAttempt(current, "register", [ip]));
    res.status(400).json({ message: "Full name, email, and password are required" });
    return;
  }

  if (password.length < 8) {
    updateDb((current) => recordRateLimitAttempt(current, "register", [ip]));
    res.status(400).json({ message: "Password must be at least 8 characters" });
    return;
  }

  const db = readDb();
  if (db.users.some((user) => user.email.toLowerCase() === email)) {
    updateDb((current) => recordRateLimitAttempt(current, "register", [ip]));
    res.status(409).json({ message: "An account with that email already exists" });
    return;
  }

  const passwordData = hashPassword(password);
  const session = buildSession();
  const newUser = {
    id: createId("user"),
    full_name: fullName,
    email,
    created_at: new Date().toISOString(),
    role: resolveUserRole(email),
    plan: "free",
    token: session.token,
    token_issued_at: session.issued_at,
    token_expires_at: session.expires_at,
    auth_provider: "password",
    oauth_accounts: {},
    password_hash: passwordData.hash,
    password_salt: passwordData.salt,
  };

  updateDb((current) => {
    const withUser = { ...current, users: [...current.users, newUser] };
    // Successful signup still counts toward the IP quota — prevents one IP
    // from creating 50 accounts in a row even with valid bodies.
    return recordRateLimitAttempt(withUser, "register", [ip]);
  });

  void notifyNewMember(newUser, {
    source: "manual_register",
    authProvider: "password",
  });

  res.status(201).json({
    token: newUser.token,
    expires_at: newUser.token_expires_at,
    user: createSafeUser(newUser),
  });
});

app.post("/api/auth/login", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const ip = getClientIp(req);

  const db = readDb();
  // Bucket per (IP, email) — keeps an attacker from drowning a victim's
  // account by exhausting their global quota from elsewhere, while still
  // preventing brute-force against any single account.
  const loginCheck = checkRateLimit(db, "login", [ip, email]);
  if (!loginCheck.allowed) {
    sendRateLimited(res, loginCheck, "login");
    return;
  }

  const user = db.users.find((entry) => entry.email.toLowerCase() === email);

  if (
    !user ||
    !user.password_hash ||
    !user.password_salt ||
    !verifyPassword(password, user.password_salt, user.password_hash)
  ) {
    updateDb((current) => recordRateLimitAttempt(current, "login", [ip, email]));
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  const session = buildSession();
  let updatedUser = null;

  updateDb((current) => {
    const withRotatedSession = {
      ...current,
      users: current.users.map((entry) => {
        if (entry.id !== user.id) {
          return entry;
        }

        updatedUser = {
          ...entry,
          role: resolveUserRole(entry.email, entry.role || "student"),
          token: session.token,
          token_issued_at: session.issued_at,
          token_expires_at: session.expires_at,
        };
        return updatedUser;
      }),
    };
    // Successful login resets the failure counter for this (IP, email).
    return clearRateLimit(withRotatedSession, "login", [ip, email]);
  });

  res.json({
    token: session.token,
    expires_at: session.expires_at,
    user: createSafeUser(updatedUser),
  });
});

app.get("/api/auth/me", requireUser, (req, res) => {
  res.json(createSafeUser(req.currentUser));
});

app.post("/api/auth/logout", requireUser, (req, res) => {
  updateDb((current) => ({
    ...current,
    users: current.users.map((user) =>
      user.id === req.currentUser.id
        ? {
            ...user,
            token: null,
            token_issued_at: null,
            token_expires_at: null,
          }
        : user,
    ),
  }));

  res.json({ ok: true });
});

app.get("/api/questions", (req, res) => {
  const mode = req.query.mode || "practice";

  if (mode === "flashcards") {
    const questions = getQuestionBank(mode, {
      seed: req.query.seed,
      size: TOTAL_PRACTICE_QUESTIONS,
    });
    res.json(applyQuestionFilters(sanitizeQuestions(questions, mode), req.query));
    return;
  }

  requireUser(req, res, () => {
    if (mode === "mock" && !isPremiumPlan(req.currentUser.plan)) {
      sendPremiumRequired(res, "mock_exams");
      return;
    }

    const db = readDb();
    const size =
      Number(req.query.limit || 0) ||
      (mode === "mock" ? 85 : TOTAL_PRACTICE_QUESTIONS);
    const excludeIds =
      mode === "mock"
        ? getSeenMockQuestionIds(db, req.currentUser.id)
        : getSeenPracticeQuestionIds(db, req.currentUser.id);
    const questions = getQuestionBank(mode, {
      seed: req.query.seed,
      size,
      excludeIds,
    });

    res.json(applyQuestionFilters(sanitizeQuestions(questions, mode), req.query));
  });
});

app.get("/api/practice/session", requireUser, (req, res) => {
  const db = readDb();
  res.json(db.practiceSessions[req.currentUser.id] || null);
});

app.put("/api/practice/session", requireUser, (req, res) => {
  const nextSession = req.body || null;
  updateDb((current) => ({
    ...current,
    practiceSessions: {
      ...current.practiceSessions,
      [req.currentUser.id]: nextSession,
    },
  }));

  res.json(nextSession);
});

app.delete("/api/practice/session", requireUser, (req, res) => {
  updateDb((current) => {
    const nextSessions = { ...current.practiceSessions };
    delete nextSessions[req.currentUser.id];
    return {
      ...current,
      practiceSessions: nextSessions,
    };
  });

  res.status(204).end();
});

app.get("/api/question-attempts", requireUser, (req, res) => {
  const db = readDb();
  res.json(db.attempts.filter((attempt) => attempt.user_id === req.currentUser.id));
});

app.post("/api/question-attempts", requireUser, (req, res) => {
  const db = readDb();
  const { entitlements } = buildUserAccessState(db, req.currentUser);

  if (
    entitlements.practice_daily_limit !== null &&
    entitlements.usage.practice_questions_remaining <= 0
  ) {
    sendPlanLimitReached(
      res,
      "practice_limit",
      entitlements.practice_daily_limit,
      entitlements.usage.practice_questions_remaining,
    );
    return;
  }

  const evaluation = evaluateQuestionAnswer(
    req.body?.question_id,
    req.body?.selected_answer,
  );

  if (!evaluation) {
    res.status(400).json({ message: "Question not found" });
    return;
  }

  const payload = {
    id: createId("attempt"),
    user_id: req.currentUser.id,
    created_at: new Date().toISOString(),
    question_id: evaluation.question_id,
    selected_answer: evaluation.selected_answer,
    is_correct: evaluation.is_correct,
    topic: evaluation.topic,
    source: req.body?.source || "practice",
  };

  updateDb((current) => ({
    ...current,
    attempts: [payload, ...current.attempts],
  }));

  const nextDb = readDb();
  res.status(201).json({
    ...payload,
    correct_answer: evaluation.correct_answer,
    explanation: evaluation.explanation,
    entitlements: buildUserAccessState(nextDb, req.currentUser).entitlements,
  });
});

app.get("/api/mock-exams", requireUser, (req, res) => {
  if (!isPremiumPlan(req.currentUser.plan)) {
    sendPremiumRequired(res, "mock_exams");
    return;
  }

  const db = readDb();
  res.json(db.mockExams.filter((exam) => exam.user_id === req.currentUser.id));
});

app.post("/api/mock-exams", requireUser, (req, res) => {
  if (!isPremiumPlan(req.currentUser.plan)) {
    sendPremiumRequired(res, "mock_exams");
    return;
  }

  const questionIds = Array.isArray(req.body?.question_ids) ? req.body.question_ids : [];
  const answers = req.body?.answers || {};
  const questions = questionIds
    .map((questionId) => evaluateQuestionAnswer(questionId, answers[questionId]))
    .filter(Boolean);

  if (questions.length === 0) {
    res.status(400).json({ message: "Mock exam questions are required" });
    return;
  }

  const correct = questions.filter((answer) => answer.is_correct).length;
  const score = Math.round((correct / questions.length) * 100);
  const passed = score >= 80;
  const domainScores = {};

  Object.keys(topicLabels).forEach((key) => {
    const topicQuestions = questions.filter((question) => question.topic === key);
    const topicCorrect = topicQuestions.filter((question) => question.is_correct).length;

    domainScores[key] =
      topicQuestions.length > 0
        ? Math.round((topicCorrect / topicQuestions.length) * 100)
        : 0;
  });

  const payload = {
    id: createId("mock_exam"),
    user_id: req.currentUser.id,
    created_at: new Date().toISOString(),
    score,
    total_questions: questions.length,
    correct_answers: correct,
    time_taken_minutes: Number(req.body?.time_taken_minutes || 0),
    status: "completed",
    answers: questions.map(({ question_id, selected_answer, is_correct }) => ({
      question_id,
      selected_answer,
      is_correct,
    })),
    passed,
    domain_scores: domainScores,
  };

  updateDb((current) => ({
    ...current,
    mockExams: [payload, ...current.mockExams],
  }));

  res.status(201).json(payload);
});

app.get("/api/dashboard", requireUser, (req, res) => {
  const db = readDb();
  const { progress, entitlements, billing } = buildUserAccessState(db, req.currentUser);
  res.json({
    progress,
    entitlements,
    billing,
    allQuestionsCount: TOTAL_PRACTICE_QUESTIONS,
    exams: db.mockExams.filter((exam) => exam.user_id === req.currentUser.id),
  });
});

app.get("/api/analytics", requireUser, (req, res) => {
  if (!isPremiumPlan(req.currentUser.plan)) {
    sendPremiumRequired(res, "analytics");
    return;
  }

  const db = readDb();
  res.json({
    progress: buildUserAccessState(db, req.currentUser).progress,
    attempts: db.attempts.filter((attempt) => attempt.user_id === req.currentUser.id),
    exams: db.mockExams.filter((exam) => exam.user_id === req.currentUser.id),
  });
});

app.get("/api/profile", requireUser, (req, res) => {
  const db = readDb();
  res.json(buildProfilePayload(db, req.currentUser));
});

app.patch("/api/profile", requireUser, (req, res) => {
  const updates = req.body || {};
  let updatedUser = null;

  updateDb((current) => ({
    ...current,
    users: current.users.map((user) => {
      if (user.id !== req.currentUser.id) {
        return user;
      }

        updatedUser = {
          ...user,
          full_name: updates.full_name ?? user.full_name,
          role: resolveUserRole(user.email, user.role || "student"),
          plan: user.plan,
        };
      return updatedUser;
    }),
  }));

  const { password_hash: _passwordHash, password_salt: _passwordSalt, ...safeUser } = updatedUser;
  res.json(safeUser);
});

app.post("/api/profile/reset-progress", requireUser, (req, res) => {
  const clearTutor = Boolean(req.body?.clear_tutor);

  updateDb((current) => {
    const nextPracticeSessions = { ...current.practiceSessions };
    delete nextPracticeSessions[req.currentUser.id];

    const nextTutorConversations = { ...current.tutorConversations };
    if (clearTutor) {
      delete nextTutorConversations[req.currentUser.id];
    }

    return {
      ...current,
      attempts: current.attempts.filter((attempt) => attempt.user_id !== req.currentUser.id),
      mockExams: current.mockExams.filter((exam) => exam.user_id !== req.currentUser.id),
      practiceSessions: nextPracticeSessions,
      tutorConversations: nextTutorConversations,
    };
  });

  const db = readDb();
  const nextUser = db.users.find((user) => user.id === req.currentUser.id) || req.currentUser;
  res.json(buildProfilePayload(db, nextUser));
});

app.post("/api/billing/checkout", requireUser, async (req, res) => {
  const selectedPlan = req.body?.plan;

  try {
    const session = await createStripeCheckoutSession({
      plan: selectedPlan,
      user: req.currentUser,
      origin: getCheckoutOrigin(req),
    });

    res.status(201).json(session);
  } catch (error) {
    res.status(400).json({ message: error.message || "Unable to start checkout" });
  }
});

app.post("/api/billing/confirm", requireUser, async (req, res) => {
  const sessionId = String(req.body?.session_id || "").trim();

  if (!sessionId) {
    res.status(400).json({ message: "Checkout session is required" });
    return;
  }

  try {
    const checkout = await confirmStripeCheckoutSession(sessionId);
    const ownsSession =
      checkout.client_reference_id === req.currentUser.id ||
      String(checkout.customer_email || "").toLowerCase() ===
        String(req.currentUser.email || "").toLowerCase();

    if (!ownsSession) {
      res.status(403).json({ message: "This checkout session does not belong to you" });
      return;
    }

    updateDb((current) => syncConfirmedCheckout(current, {
      id: checkout.session_id,
      metadata: { plan: checkout.plan, user_id: req.currentUser.id },
      customer: checkout.customer_id,
      subscription: checkout.subscription_id,
      amount_total: Math.round(Number(checkout.amount_total || 0)),
      currency: checkout.currency,
      payment_status: checkout.payment_status,
      status: checkout.status,
      created: Math.floor(new Date(checkout.completed_at).getTime() / 1000),
      customer_details: { email: checkout.customer_email },
      customer_email: checkout.customer_email,
      client_reference_id: checkout.client_reference_id || req.currentUser.id,
    }, createId));

    const db = readDb();
    const nextUser =
      db.users.find((user) => user.id === req.currentUser.id) || req.currentUser;
    res.json(buildProfilePayload(db, nextUser));
  } catch (error) {
    res.status(400).json({ message: error.message || "Unable to confirm checkout" });
  }
});

app.post("/api/billing/portal", requireUser, async (req, res) => {
  try {
    const session = await createStripePortalSession({
      customerId: req.currentUser.stripe_customer_id,
      origin: getCheckoutOrigin(req),
    });
    res.json(session);
  } catch (error) {
    res.status(400).json({ message: error.message || "Unable to open billing portal" });
  }
});

app.get("/api/admin/members", requireAdmin, (req, res) => {
  const db = readDb();
    const members = db.users.map((user) => {
      const progress = computeProgress(db, user.id);
      const attemptsCount = db.attempts.filter((attempt) => attempt.user_id === user.id).length;
      const examsCount = db.mockExams.filter((exam) => exam.user_id === user.id).length;
      const memberPayments = db.payments.filter((payment) => payment.user_id === user.id);
      const completedPayments = memberPayments.filter((payment) => payment.status === "completed");
      const totalPaid = completedPayments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0,
      );
      const latestPayment = [...memberPayments].sort((left, right) => {
        const leftTime = new Date(left.payment_date || left.created_at || 0).getTime();
        const rightTime = new Date(right.payment_date || right.created_at || 0).getTime();
        return rightTime - leftTime;
      })[0];

      return {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        created_at: user.created_at || null,
        auth_provider: user.auth_provider || "password",
        role: resolveUserRole(user.email, user.role || "student"),
        plan: user.plan || "free",
        study_streak_days: progress.study_streak_days,
        readiness_score: progress.readiness_score,
        total_questions_completed: progress.total_questions_completed,
        attempts_count: attemptsCount,
        exams_count: examsCount,
        last_study_date: progress.last_study_date,
        payments_count: memberPayments.length,
        total_paid_amount: Number(totalPaid.toFixed(2)),
        last_payment_date: latestPayment?.payment_date || latestPayment?.created_at || null,
      };
    });

  res.json(members);
});

app.get("/api/admin/members/:memberId/payments", requireAdmin, (req, res) => {
  const { memberId } = req.params;
  const db = readDb();
  const member = db.users.find((user) => user.id === memberId);

  if (!member) {
    res.status(404).json({ message: "Member not found" });
    return;
  }

  const payments = db.payments
    .filter((payment) => payment.user_id === memberId)
    .sort((left, right) => {
      const leftTime = new Date(left.payment_date || left.created_at || 0).getTime();
      const rightTime = new Date(right.payment_date || right.created_at || 0).getTime();
      return rightTime - leftTime;
    });

  res.json({
    member: {
      id: member.id,
      full_name: member.full_name,
      email: member.email,
      plan: member.plan || "free",
      auth_provider: member.auth_provider || "password",
    },
    payments,
  });
});

app.patch("/api/admin/members/:memberId", requireAdmin, (req, res) => {
  const { memberId } = req.params;
  const updates = req.body || {};
  let updatedUser = null;

  updateDb((current) => ({
    ...current,
    users: current.users.map((user) => {
      if (user.id !== memberId) {
        return user;
      }

      updatedUser = {
        ...user,
        full_name: updates.full_name ?? user.full_name,
        role: resolveUserRole(
          user.email,
          updates.role === "admin" || updates.role === "student" ? updates.role : user.role,
        ),
        plan:
          updates.plan === "premium_monthly" ||
          updates.plan === "premium_yearly" ||
          updates.plan === "free"
            ? updates.plan
            : user.plan,
      };

      return updatedUser;
    }),
  }));

  if (!updatedUser) {
    res.status(404).json({ message: "Member not found" });
    return;
  }

  res.json({
    id: updatedUser.id,
    full_name: updatedUser.full_name,
    email: updatedUser.email,
    role: updatedUser.role,
    plan: updatedUser.plan,
  });
});

app.delete("/api/admin/members/:memberId", requireAdmin, (req, res) => {
  const { memberId } = req.params;

  if (req.currentUser.id === memberId) {
    res.status(400).json({ message: "You cannot delete your own admin account." });
    return;
  }

  let deletedUser = null;

  updateDb((current) => {
    deletedUser = current.users.find((user) => user.id === memberId) || null;

    if (!deletedUser) {
      return current;
    }

    const nextPracticeSessions = { ...current.practiceSessions };
    delete nextPracticeSessions[memberId];

    const nextTutorConversations = { ...current.tutorConversations };
    delete nextTutorConversations[memberId];

    return {
      ...current,
      users: current.users.filter((user) => user.id !== memberId),
      attempts: current.attempts.filter((attempt) => attempt.user_id !== memberId),
      mockExams: current.mockExams.filter((exam) => exam.user_id !== memberId),
      payments: current.payments.filter((payment) => payment.user_id !== memberId),
      practiceSessions: nextPracticeSessions,
      tutorConversations: nextTutorConversations,
    };
  });

  if (!deletedUser) {
    res.status(404).json({ message: "Member not found" });
    return;
  }

  res.status(204).end();
});

app.get("/api/ai-tutor/conversations", requireUser, (req, res) => {
  const db = readDb();
  res.json({
    conversations: db.tutorConversations[req.currentUser.id] || [],
    entitlements: buildUserAccessState(db, req.currentUser).entitlements,
  });
});

app.post("/api/ai-tutor/conversations", requireUser, (req, res) => {
  const conversation = {
    id: createId("convo"),
    metadata: { name: req.body?.name || "New Chat" },
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  updateDb((current) => {
    const currentConversations = current.tutorConversations[req.currentUser.id] || [];
    return {
      ...current,
      tutorConversations: {
        ...current.tutorConversations,
        [req.currentUser.id]: [conversation, ...currentConversations],
      },
    };
  });

  const db = readDb();
  res.status(201).json({
    conversation,
    entitlements: buildUserAccessState(db, req.currentUser).entitlements,
  });
});

app.post("/api/ai-tutor/conversations/:conversationId/messages/stream", requireUser, async (req, res) => {
  const { conversationId } = req.params;
  const content = String(req.body?.content || "").trim();

  if (!content) {
    res.status(400).json({ message: "Message content is required" });
    return;
  }

  if (!isOpenAIConfigured()) {
    res.status(503).json({
      message: "Streaming tutor requires OPENAI_API_KEY. Use the non-streaming endpoint as fallback.",
      code: "openai_not_configured",
    });
    return;
  }

  const db = readDb();
  const { entitlements, progress } = buildUserAccessState(db, req.currentUser);

  if (
    entitlements.ai_tutor_daily_limit !== null &&
    entitlements.usage.tutor_messages_remaining <= 0
  ) {
    sendPlanLimitReached(
      res,
      "ai_tutor_limit",
      entitlements.ai_tutor_daily_limit,
      entitlements.usage.tutor_messages_remaining,
    );
    return;
  }

  const currentConversation = (db.tutorConversations[req.currentUser.id] || []).find(
    (conversation) => conversation.id === conversationId,
  );

  if (!currentConversation) {
    res.status(404).json({ message: "Conversation not found" });
    return;
  }

  // Open the SSE channel — must flush headers before first chunk.
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const sendEvent = (eventName, data) => {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Persist the user message immediately so the conversation reflects intent
  // even if the LLM stream fails midway.
  const userMessage = {
    id: createId("msg"),
    role: "user",
    content,
    created_at: new Date().toISOString(),
  };

  updateDb((current) => {
    const list = current.tutorConversations[req.currentUser.id] || [];
    return {
      ...current,
      tutorConversations: {
        ...current.tutorConversations,
        [req.currentUser.id]: list.map((conversation) =>
          conversation.id !== conversationId
            ? conversation
            : {
                ...conversation,
                metadata: {
                  ...conversation.metadata,
                  name:
                    conversation.metadata?.name === "New Chat"
                      ? content.slice(0, 50)
                      : conversation.metadata?.name || content.slice(0, 50),
                },
                messages: [...(conversation.messages || []), userMessage],
                updatedAt: new Date().toISOString(),
              },
        ),
      },
    };
  });

  let fullContent = "";

  try {
    for await (const chunk of streamTutorReplyOpenAI({
      content,
      history: currentConversation.messages || [],
      progress,
    })) {
      if (chunk.delta) {
        sendEvent("delta", { content: chunk.delta });
      }
      if (chunk.done) {
        fullContent = chunk.fullContent || fullContent;
      }
    }

    const assistantMessage = {
      id: createId("msg"),
      role: "assistant",
      content: fullContent,
      created_at: new Date().toISOString(),
    };

    updateDb((current) => {
      const list = current.tutorConversations[req.currentUser.id] || [];
      return {
        ...current,
        tutorConversations: {
          ...current.tutorConversations,
          [req.currentUser.id]: list.map((conversation) =>
            conversation.id !== conversationId
              ? conversation
              : {
                  ...conversation,
                  messages: [...(conversation.messages || []), assistantMessage],
                  updatedAt: new Date().toISOString(),
                },
          ),
        },
      };
    });

    const nextDb = readDb();
    sendEvent("done", {
      message: assistantMessage,
      entitlements: buildUserAccessState(nextDb, req.currentUser).entitlements,
    });
  } catch (error) {
    console.error("[tutor stream] error:", error.message);
    sendEvent("error", { message: error.message || "Stream failed" });
  } finally {
    res.end();
  }
});

app.post("/api/ai-tutor/conversations/:conversationId/messages", requireUser, async (req, res) => {
  const { conversationId } = req.params;
  const content = String(req.body?.content || "").trim();

  if (!content) {
    res.status(400).json({ message: "Message content is required" });
    return;
  }

  const db = readDb();
  const { entitlements, progress } = buildUserAccessState(db, req.currentUser);

  if (
    entitlements.ai_tutor_daily_limit !== null &&
    entitlements.usage.tutor_messages_remaining <= 0
  ) {
    sendPlanLimitReached(
      res,
      "ai_tutor_limit",
      entitlements.ai_tutor_daily_limit,
      entitlements.usage.tutor_messages_remaining,
    );
    return;
  }

  const userMessage = {
    id: createId("msg"),
    role: "user",
    content,
    created_at: new Date().toISOString(),
  };
  const currentConversation = (db.tutorConversations[req.currentUser.id] || []).find(
    (conversation) => conversation.id === conversationId,
  );
  const tutorReply = await createTutorReply(content, {
    history: currentConversation?.messages || [],
    progress,
  });
  const assistantMessage = {
    id: createId("msg"),
    role: "assistant",
    content: tutorReply.content,
    created_at: new Date().toISOString(),
  };
  if (tutorReply.quiz) {
    assistantMessage.quiz = tutorReply.quiz;
  }
  if (tutorReply.followUp) {
    assistantMessage.follow_up = tutorReply.followUp;
  }

  let updatedConversation = null;

  updateDb((current) => {
    const currentConversations = current.tutorConversations[req.currentUser.id] || [];
    return {
      ...current,
      tutorConversations: {
        ...current.tutorConversations,
        [req.currentUser.id]: currentConversations.map((conversation) => {
          if (conversation.id !== conversationId) {
            return conversation;
          }

          updatedConversation = {
            ...conversation,
            metadata: {
              ...conversation.metadata,
              name:
                conversation.metadata?.name === "New Chat"
                  ? content.slice(0, 50)
                  : conversation.metadata?.name || content.slice(0, 50),
            },
            messages: [...(conversation.messages || []), userMessage, assistantMessage],
            updatedAt: new Date().toISOString(),
          };

          return updatedConversation;
        }),
      },
    };
  });

  if (!updatedConversation) {
    res.status(404).json({ message: "Conversation not found" });
    return;
  }

  const nextDb = readDb();
  res.status(201).json({
    conversation: updatedConversation,
    entitlements: buildUserAccessState(nextDb, req.currentUser).entitlements,
  });
});

app.listen(port, () => {
  console.log(`RBT Genius API listening on http://localhost:${port}`);
});
