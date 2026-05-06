import { getStore } from "@netlify/blobs";
import { computeProgress } from "../../src/lib/backend-core.js";
import {
  baseQuestions,
  buildFlashcardBank,
  buildMockExamQuestionSet,
  buildPracticeQuestionBank,
  evaluateQuestionAnswer,
  sanitizeQuestions,
  TOTAL_PRACTICE_QUESTIONS,
  topicLabels,
} from "../../src/lib/question-bank.js";
import {
  buildSession,
  hashPassword,
  isSessionExpired,
  shouldRotateSession,
  verifyPassword,
} from "../../server/lib/auth.js";
import {
  checkRateLimit,
  clearRateLimit,
  recordRateLimitAttempt,
} from "../../server/lib/rate-limit.js";
import {
  buildOAuthAuthorizationUrl,
  createOAuthState,
  exchangeOAuthCodeForProfile,
  listOAuthProviders,
  normalizeOrigin,
  normalizeRedirectPath,
} from "../../server/lib/oauth.js";
import { buildSeedDb, normalizeDb, resolveUserRole } from "../../server/lib/seed.js";
import {
  confirmStripeCheckoutSession,
  constructStripeWebhookEvent,
  createStripeCheckoutSession,
  createStripePortalSession,
  getBillingConfig,
} from "../../server/lib/billing.js";
import {
  applyStripeWebhookEvent,
  findUserForBilling,
  syncConfirmedCheckout,
} from "../../server/lib/stripe-sync.js";
import {
  notifyNewMember,
  notifyNewSubscription,
} from "../../server/lib/admin-notify.js";
import {
  countTutorMessagesToday,
  getEntitlements,
  isPremiumPlan,
} from "../../src/lib/plan-access.js";
import {
  createTutorReply,
  isOpenAIConfigured,
  streamTutorReplyOpenAI,
} from "../../server/lib/tutor.js";

function getDbStore() {
  return getStore({ name: "rbt-genius-data", consistency: "strong" });
}

async function withFreshStore(operation) {
  try {
    return await operation(getDbStore());
  } catch (error) {
    const message = String(error?.message || "");
    if (!message.toLowerCase().includes("token expired")) {
      throw error;
    }

    return operation(getDbStore());
  }
}

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      ...(init.headers || {}),
    },
  });
}

function redirect(url, init = {}) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      ...(init.headers || {}),
    },
  });
}

async function readDb() {
  const db = await withFreshStore((store) => store.get("db", { type: "json" }));
  if (db) {
    return normalizeDb(db);
  }

  const seed = buildSeedDb();
  await withFreshStore((store) => store.setJSON("db", seed));
  return seed;
}

async function writeDb(nextDb) {
  const payload = normalizeDb({
    ...nextDb,
    updatedAt: new Date().toISOString(),
  });
  await withFreshStore((store) => store.setJSON("db", payload));
  return payload;
}

async function updateDb(updater) {
  const current = await readDb();
  const next = updater(current);
  return writeDb(next);
}

function getQuestionBank(mode = "practice", options = {}) {
  const { seed, size, excludeIds } = options;

  if (mode === "flashcards") {
    return buildFlashcardBank(size || TOTAL_PRACTICE_QUESTIONS, seed);
  }

  if (mode === "mock") {
    return buildMockExamQuestionSet(size || 85, null, seed, { excludeIds });
  }

  if (mode === "base") {
    return baseQuestions;
  }

  return buildPracticeQuestionBank(size || TOTAL_PRACTICE_QUESTIONS, seed, {
    excludeIds,
  });
}

function applyQuestionFilters(questions, searchParams) {
  const topic = searchParams.get("topic") || "all";
  const difficulty = searchParams.get("difficulty") || "all";
  const limit = Number(searchParams.get("limit") || 0);
  const offset = Math.max(0, Number(searchParams.get("offset") || 0));

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

function createSafeUser(user) {
  const { password_hash: _passwordHash, password_salt: _passwordSalt, ...safeUser } = user;
  return safeUser;
}

function buildUserAccessState(db, user) {
  const progress = computeProgress(db, user.id);
  const tutorMessagesToday = countTutorMessagesToday(db.tutorConversations[user.id] || []);
  return {
    progress,
    entitlements: getEntitlements(user.plan, {
      practiceQuestionsToday: progress.questions_today,
      tutorMessagesToday,
    }),
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

function sendPremiumRequired(feature) {
  return json(
    {
      message: "Premium membership required",
      code: "premium_required",
      feature,
    },
    { status: 403 },
  );
}

function sendPlanLimitReached(feature, limit, remaining) {
  return json(
    {
      message: "Daily plan limit reached",
      code: "plan_limit_reached",
      feature,
      limit,
      remaining,
    },
    { status: 403 },
  );
}

function getCheckoutOrigin(request) {
  return normalizeOrigin(request.headers.get("origin"), new URL(request.url).origin);
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

async function consumeOAuthState(stateId) {
  let stateRecord = null;

  await updateDb((current) => {
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

async function upsertOAuthUser(profile, providerId) {
  let safeUser = null;
  let session = null;
  let wasCreated = false;

  await updateDb((current) => {
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

function getToken(request) {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length);
}

function getClientIp(request) {
  // Netlify exposes the real client IP in this header. Fall back to the
  // standard X-Forwarded-For (first hop = original client) if needed.
  const netlifyIp = request.headers.get("x-nf-client-connection-ip");
  if (netlifyIp) return netlifyIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  return "unknown";
}

function rateLimited(decision, feature) {
  return json(
    {
      message: "Too many attempts. Please wait and try again.",
      code: "rate_limited",
      feature,
      retry_after_seconds: decision.retryAfterSeconds,
    },
    {
      status: 429,
      headers: { "Retry-After": String(decision.retryAfterSeconds) },
    },
  );
}

async function getCurrentUser(request) {
  const token = getToken(request);
  if (!token) {
    return null;
  }

  const db = await readDb();
  const user = db.users.find((entry) => entry.token === token) || null;
  if (!user) return null;
  if (isSessionExpired(user)) return null;
  return user;
}

async function rotateUserSession(user) {
  const session = buildSession();
  let rotatedUser = user;
  await updateDb((current) => ({
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

  return { user: rotatedUser, session };
}

async function requireUser(request) {
  const user = await getCurrentUser(request);

  if (!user) {
    return {
      error: json(
        {
          message: "Authentication required",
          extra_data: { reason: "auth_required" },
        },
        { status: 401 },
      ),
    };
  }

  return { user };
}

async function requireAdmin(request) {
  const auth = await requireUser(request);
  if (auth.error) {
    return auth;
  }

  if (auth.user?.role !== "admin") {
    return {
      error: json({ message: "Admin access required" }, { status: 403 }),
    };
  }

  return auth;
}

function getApiPath(url) {
  const { pathname } = new URL(url);
  return pathname
    .replace(/^\/\.netlify\/functions\/api/, "")
    .replace(/^\/api/, "") || "/";
}

function isOAuthStartRoute(apiPath) {
  return /^\/auth\/oauth\/[^/]+\/start$/.test(apiPath);
}

function isOAuthCallbackRoute(apiPath) {
  return /^\/auth\/oauth\/[^/]+\/callback$/.test(apiPath);
}

async function parseCallbackParams(request) {
  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const bodyText = await request.text();
      return Object.fromEntries(new URLSearchParams(bodyText));
    }

    if (contentType.includes("application/json")) {
      return await request.json();
    }
  }

  const url = new URL(request.url);
  return Object.fromEntries(url.searchParams.entries());
}

export default async (request) => {
  if (request.method === "OPTIONS") {
    return json({}, { status: 204 });
  }

  const url = new URL(request.url);
  const apiPath = getApiPath(request.url);

  if (apiPath === "/billing/webhook" && request.method === "POST") {
    try {
      const payload = await request.text();
      const event = constructStripeWebhookEvent(
        payload,
        request.headers.get("stripe-signature"),
      );

      const current = await readDb();
      if (current?.stripeEvents?.[event.id]) {
        return json({ received: true, duplicate: true });
      }

      const next = applyStripeWebhookEvent(current, event, createId);
      await writeDb(next);

      if (event.type === "checkout.session.completed") {
        const checkout = event.data?.object || {};
        const user = findUserForBilling(next, {
          userId: checkout.client_reference_id,
          customerId:
            typeof checkout.customer === "string" ? checkout.customer : checkout.customer?.id,
          subscriptionId:
            typeof checkout.subscription === "string"
              ? checkout.subscription
              : checkout.subscription?.id,
          email: checkout.customer_details?.email || checkout.customer_email,
        });

        if (user) {
          const plan = checkout.metadata?.plan || user.plan;
          await notifyNewSubscription({ user, plan, checkout });
        }
      }

      return json({ received: true });
    } catch (error) {
      return json(
        { message: error.message || "Invalid Stripe webhook event" },
        { status: 400 },
      );
    }
  }

  if (apiPath === "/health" && request.method === "GET") {
    return json({ ok: true });
  }

  if (apiPath === "/public-settings" && request.method === "GET") {
    return json({
      auth_required: true,
      app_name: "RBT Genius",
      billing: getBillingConfig(),
    });
  }

  if (apiPath === "/auth/providers" && request.method === "GET") {
    return json({
      providers: listOAuthProviders(),
    });
  }

  if (request.method === "GET" && isOAuthStartRoute(apiPath)) {
    const providerId = apiPath.split("/")[3];
    const redirectTo = normalizeRedirectPath(url.searchParams.get("redirectTo"));
    const backendOrigin = url.origin;
    const frontendOrigin = normalizeOrigin(url.searchParams.get("origin"), backendOrigin);
    const state = createOAuthState();

    try {
      await updateDb((current) => ({
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

      return Response.redirect(
        buildOAuthAuthorizationUrl({
          providerId,
          state,
          backendOrigin,
        }),
        302,
      );
    } catch (error) {
      return Response.redirect(
        buildFrontendLoginRedirect(frontendOrigin, redirectTo, {
          oauthError: error.message || "Unable to start sign-in",
        }),
        302,
      );
    }
  }

  if ((request.method === "GET" || request.method === "POST") && isOAuthCallbackRoute(apiPath)) {
    const providerId = apiPath.split("/")[3];
    const callbackParams = await parseCallbackParams(request);
    const stateRecord = await consumeOAuthState(String(callbackParams.state || ""));
    const frontendOrigin = stateRecord?.frontend_origin || url.origin;
    const redirectTo = stateRecord?.redirect_to || "/";

    if (!stateRecord || stateRecord.provider_id !== providerId) {
      return Response.redirect(
        buildFrontendLoginRedirect(frontendOrigin, redirectTo, {
          oauthError: "Your sign-in session expired. Please try again.",
        }),
        302,
      );
    }

    if (callbackParams.error) {
      return Response.redirect(
        buildFrontendLoginRedirect(frontendOrigin, redirectTo, {
          oauthError: callbackParams.error_description || callbackParams.error,
        }),
        302,
      );
    }

    try {
      const profile = await exchangeOAuthCodeForProfile({
        providerId,
        code: String(callbackParams.code || ""),
        backendOrigin: url.origin,
        callbackParams,
      });
      const authData = await upsertOAuthUser(profile, providerId);

      if (authData.created) {
        await notifyNewMember(authData.user, {
          source: "oauth",
          authProvider: providerId,
        });
      }

      return Response.redirect(
        buildFrontendLoginRedirect(frontendOrigin, redirectTo, {
          authToken: authData.token,
        }),
        302,
      );
    } catch (error) {
      return Response.redirect(
        buildFrontendLoginRedirect(frontendOrigin, redirectTo, {
          oauthError: error.message || "Unable to complete sign-in",
        }),
        302,
      );
    }
  }

  // Native mobile Google Sign-In: accepts the idToken from @react-native-google-signin/google-signin
  if (apiPath === "/auth/google" && request.method === "POST") {
    const body = await request.json();
    const idToken = String(body?.id_token || "").trim();

    if (!idToken) {
      return json({ message: "id_token is required" }, { status: 400 });
    }

    try {
      const tokenRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      );
      const tokenData = await tokenRes.json();

      if (!tokenRes.ok || tokenData.error) {
        return json({ message: "Invalid Google token" }, { status: 401 });
      }

      const ALLOWED_AUDIENCES = [
        "37632251231-4l1t8mg15isp9ck5uvcpelrv5uvj2o66.apps.googleusercontent.com",
        "37632251231-th4qu526qnm34f3uitq7m363dolsu1f0.apps.googleusercontent.com",
      ];
      if (!ALLOWED_AUDIENCES.includes(tokenData.aud)) {
        return json({ message: "Token audience mismatch" }, { status: 401 });
      }

      const profile = {
        id: tokenData.sub,
        email: String(tokenData.email || "").trim().toLowerCase(),
        name: tokenData.name || tokenData.email,
      };

      if (!profile.email) {
        return json({ message: "Google did not return an email address" }, { status: 401 });
      }

      const authData = await upsertOAuthUser(profile, "google");
      return json({ token: authData.token, user: authData.user });
    } catch (err) {
      return json({ message: err.message || "Google sign-in failed" }, { status: 500 });
    }
  }

  if (apiPath === "/auth/register" && request.method === "POST") {
    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const fullName = String(body?.full_name || "").trim();
    const ip = getClientIp(request);

    const initialDb = await readDb();
    const registerCheck = checkRateLimit(initialDb, "register", [ip]);
    if (!registerCheck.allowed) {
      return rateLimited(registerCheck, "register");
    }

    if (!email || !password || !fullName) {
      await updateDb((current) => recordRateLimitAttempt(current, "register", [ip]));
      return json(
        { message: "Full name, email, and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      await updateDb((current) => recordRateLimitAttempt(current, "register", [ip]));
      return json({ message: "Password must be at least 8 characters" }, { status: 400 });
    }

    const db = await readDb();
    if (db.users.some((user) => user.email.toLowerCase() === email)) {
      await updateDb((current) => recordRateLimitAttempt(current, "register", [ip]));
      return json(
        { message: "An account with that email already exists" },
        { status: 409 },
      );
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

    await updateDb((current) => {
      const withUser = { ...current, users: [...current.users, newUser] };
      // Successful signup still counts toward the IP quota.
      return recordRateLimitAttempt(withUser, "register", [ip]);
    });

    await notifyNewMember(newUser, {
      source: "manual_register",
      authProvider: "password",
    });

    return json(
      {
        token: newUser.token,
        expires_at: newUser.token_expires_at,
        user: createSafeUser(newUser),
      },
      { status: 201 },
    );
  }

  if (apiPath === "/auth/login" && request.method === "POST") {
    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const ip = getClientIp(request);

    const db = await readDb();
    const loginCheck = checkRateLimit(db, "login", [ip, email]);
    if (!loginCheck.allowed) {
      return rateLimited(loginCheck, "login");
    }

    const user = db.users.find((entry) => entry.email.toLowerCase() === email);

    if (
      !user ||
      !user.password_hash ||
      !user.password_salt ||
      !verifyPassword(password, user.password_salt, user.password_hash)
    ) {
      await updateDb((current) => recordRateLimitAttempt(current, "login", [ip, email]));
      return json({ message: "Invalid email or password" }, { status: 401 });
    }

    const session = buildSession();
    let updatedUser = null;

    await updateDb((current) => {
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

    return json({
      token: session.token,
      expires_at: session.expires_at,
      user: createSafeUser(updatedUser),
    });
  }

  if (apiPath === "/auth/me" && request.method === "GET") {
    const auth = await requireUser(request);
    if (auth.error) {
      return auth.error;
    }

    // Sliding rotation: when the session is within the refresh window,
    // mint a new token and return it in the body so the client updates storage.
    if (shouldRotateSession(auth.user)) {
      const { user: rotatedUser, session } = await rotateUserSession(auth.user);
      return json({
        ...createSafeUser(rotatedUser),
        token: session.token,
        expires_at: session.expires_at,
      });
    }

    return json({
      ...createSafeUser(auth.user),
      expires_at: auth.user.token_expires_at,
    });
  }

  if (apiPath === "/auth/logout" && request.method === "POST") {
    const auth = await requireUser(request);
    if (auth.error) {
      return auth.error;
    }

    await updateDb((current) => ({
      ...current,
      users: current.users.map((user) =>
        user.id === auth.user.id
          ? {
              ...user,
              token: null,
              token_issued_at: null,
              token_expires_at: null,
            }
          : user,
      ),
    }));

    return json({ ok: true });
  }

  if (apiPath === "/questions" && request.method === "GET") {
    const mode = url.searchParams.get("mode") || "practice";

    if (mode === "flashcards") {
      const questions = getQuestionBank(mode, {
        seed: url.searchParams.get("seed"),
        size: TOTAL_PRACTICE_QUESTIONS,
      });
      return json(applyQuestionFilters(sanitizeQuestions(questions, mode), url.searchParams));
    }

    const auth = await requireUser(request);
    if (auth.error) {
      return auth.error;
    }

    if (mode === "mock" && !isPremiumPlan(auth.user.plan)) {
      return sendPremiumRequired("mock_exams");
    }

    const db = await readDb();
    const size =
      Number(url.searchParams.get("limit") || 0) ||
      (mode === "mock" ? 85 : TOTAL_PRACTICE_QUESTIONS);
    const excludeIds =
      mode === "mock"
        ? getSeenMockQuestionIds(db, auth.user.id)
        : getSeenPracticeQuestionIds(db, auth.user.id);
    const questions = getQuestionBank(mode, {
      seed: url.searchParams.get("seed"),
      size,
      excludeIds,
    });

    return json(applyQuestionFilters(sanitizeQuestions(questions, mode), url.searchParams));
  }

  if (apiPath === "/practice/session" && request.method === "GET") {
    const auth = await requireUser(request);
    if (auth.error) {
      return auth.error;
    }

    const db = await readDb();
    return json(db.practiceSessions[auth.user.id] || null);
  }

  if (apiPath === "/practice/session" && request.method === "PUT") {
    const auth = await requireUser(request);
    if (auth.error) {
      return auth.error;
    }

    const nextSession = await request.json();
    await updateDb((current) => ({
      ...current,
      practiceSessions: {
        ...current.practiceSessions,
        [auth.user.id]: nextSession,
      },
    }));

    return json(nextSession);
  }

  if (apiPath === "/practice/session" && request.method === "DELETE") {
    const auth = await requireUser(request);
    if (auth.error) {
      return auth.error;
    }

    await updateDb((current) => {
      const nextSessions = { ...current.practiceSessions };
      delete nextSessions[auth.user.id];
      return {
        ...current,
        practiceSessions: nextSessions,
      };
    });

    return json({}, { status: 204 });
  }

  if (apiPath === "/question-attempts" && request.method === "GET") {
    const auth = await requireUser(request);
    if (auth.error) {
      return auth.error;
    }

    const db = await readDb();
    return json(db.attempts.filter((attempt) => attempt.user_id === auth.user.id));
  }

  if (apiPath === "/question-attempts" && request.method === "POST") {
    const auth = await requireUser(request);
    if (auth.error) {
      return auth.error;
    }

    const db = await readDb();
    const { entitlements } = buildUserAccessState(db, auth.user);
    if (
      entitlements.practice_daily_limit !== null &&
      entitlements.usage.practice_questions_remaining <= 0
    ) {
      return sendPlanLimitReached(
        "practice_limit",
        entitlements.practice_daily_limit,
        entitlements.usage.practice_questions_remaining,
      );
    }

    const body = await request.json();
    const evaluation = evaluateQuestionAnswer(body?.question_id, body?.selected_answer);

    if (!evaluation) {
      return json({ message: "Question not found" }, { status: 400 });
    }

    const payload = {
      id: createId("attempt"),
      user_id: auth.user.id,
      created_at: new Date().toISOString(),
      question_id: evaluation.question_id,
      selected_answer: evaluation.selected_answer,
      is_correct: evaluation.is_correct,
      topic: evaluation.topic,
      source: body?.source || "practice",
    };

    await updateDb((current) => ({
      ...current,
      attempts: [payload, ...current.attempts],
    }));

    const nextDb = await readDb();
    return json(
      {
        ...payload,
        correct_answer: evaluation.correct_answer,
        explanation: evaluation.explanation,
        entitlements: buildUserAccessState(nextDb, auth.user).entitlements,
      },
      { status: 201 },
    );
  }

  if (apiPath === "/mock-exams" && request.method === "GET") {
    const auth = await requireUser(request);
    if (auth.error) {
      return auth.error;
    }

    if (!isPremiumPlan(auth.user.plan)) {
      return sendPremiumRequired("mock_exams");
    }

    const db = await readDb();
    return json(db.mockExams.filter((exam) => exam.user_id === auth.user.id));
  }

  if (apiPath === "/mock-exams" && request.method === "POST") {
    const auth = await requireUser(request);
    if (auth.error) {
      return auth.error;
    }

    if (!isPremiumPlan(auth.user.plan)) {
      return sendPremiumRequired("mock_exams");
    }

    const body = await request.json();
    const questionIds = Array.isArray(body?.question_ids) ? body.question_ids : [];
    const answers = body?.answers || {};
    const questions = questionIds
      .map((questionId) => evaluateQuestionAnswer(questionId, answers[questionId]))
      .filter(Boolean);

    if (questions.length === 0) {
      return json({ message: "Mock exam questions are required" }, { status: 400 });
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
      user_id: auth.user.id,
      created_at: new Date().toISOString(),
      score,
      total_questions: questions.length,
      correct_answers: correct,
      time_taken_minutes: Number(body?.time_taken_minutes || 0),
      status: "completed",
      answers: questions.map(({ question_id, selected_answer, is_correct }) => ({
        question_id,
        selected_answer,
        is_correct,
      })),
      passed,
      domain_scores: domainScores,
    };

    await updateDb((current) => ({
      ...current,
      mockExams: [payload, ...current.mockExams],
    }));

    return json(payload, { status: 201 });
  }

  if (apiPath === "/dashboard" && request.method === "GET") {
    const auth = await requireUser(request);
    if (auth.error) {
      return auth.error;
    }

    const db = await readDb();
    const { progress, entitlements, billing } = buildUserAccessState(db, auth.user);
    return json({
      progress,
      entitlements,
      billing,
      allQuestionsCount: TOTAL_PRACTICE_QUESTIONS,
      exams: db.mockExams.filter((exam) => exam.user_id === auth.user.id),
    });
  }

  if (apiPath === "/analytics" && request.method === "GET") {
    const auth = await requireUser(request);
    if (auth.error) {
      return auth.error;
    }

    if (!isPremiumPlan(auth.user.plan)) {
      return sendPremiumRequired("analytics");
    }

    const db = await readDb();
    return json({
      progress: buildUserAccessState(db, auth.user).progress,
      attempts: db.attempts.filter((attempt) => attempt.user_id === auth.user.id),
      exams: db.mockExams.filter((exam) => exam.user_id === auth.user.id),
    });
  }

  if (apiPath === "/profile" && request.method === "GET") {
    const auth = await requireUser(request);
    if (auth.error) {
      return auth.error;
    }

    const db = await readDb();
    return json(buildProfilePayload(db, auth.user));
  }

  if (apiPath === "/profile" && request.method === "PATCH") {
    const auth = await requireUser(request);
    if (auth.error) {
      return auth.error;
    }

    const updates = await request.json();
    let updatedUser = null;

    await updateDb((current) => ({
      ...current,
      users: current.users.map((user) => {
        if (user.id !== auth.user.id) {
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

    const { password_hash: _passwordHash, password_salt: _passwordSalt, ...safeUser } =
      updatedUser;
    return json(safeUser);
  }

  if (apiPath === "/profile/reset-progress" && request.method === "POST") {
    const auth = await requireUser(request);
    if (auth.error) {
      return auth.error;
    }

    const body = await request.json();
    const clearTutor = Boolean(body?.clear_tutor);

    await updateDb((current) => {
      const nextPracticeSessions = { ...current.practiceSessions };
      delete nextPracticeSessions[auth.user.id];

      const nextTutorConversations = { ...current.tutorConversations };
      if (clearTutor) {
        delete nextTutorConversations[auth.user.id];
      }

      return {
        ...current,
        attempts: current.attempts.filter((attempt) => attempt.user_id !== auth.user.id),
        mockExams: current.mockExams.filter((exam) => exam.user_id !== auth.user.id),
        practiceSessions: nextPracticeSessions,
        tutorConversations: nextTutorConversations,
      };
    });

    const db = await readDb();
    const nextUser = db.users.find((user) => user.id === auth.user.id) || auth.user;
    return json(buildProfilePayload(db, nextUser));
  }

  if (apiPath === "/billing/checkout" && request.method === "POST") {
    const auth = await requireUser(request);
    if (auth.error) {
      return auth.error;
    }

    try {
      const body = await request.json();
      const session = await createStripeCheckoutSession({
        plan: body?.plan,
        user: auth.user,
        origin: getCheckoutOrigin(request),
      });
      return json(session, { status: 201 });
    } catch (error) {
      return json({ message: error.message || "Unable to start checkout" }, { status: 400 });
    }
  }

  if (apiPath === "/billing/confirm" && request.method === "POST") {
    const auth = await requireUser(request);
    if (auth.error) {
      return auth.error;
    }

    try {
      const body = await request.json();
      const sessionId = String(body?.session_id || "").trim();
      if (!sessionId) {
        return json({ message: "Checkout session is required" }, { status: 400 });
      }

      const checkout = await confirmStripeCheckoutSession(sessionId);
      const ownsSession =
        checkout.client_reference_id === auth.user.id ||
        String(checkout.customer_email || "").toLowerCase() ===
          String(auth.user.email || "").toLowerCase();

      if (!ownsSession) {
        return json(
          { message: "This checkout session does not belong to you" },
          { status: 403 },
        );
      }

      await updateDb((current) =>
        syncConfirmedCheckout(
          current,
          {
            id: checkout.session_id,
            metadata: { plan: checkout.plan, user_id: auth.user.id },
            customer: checkout.customer_id,
            subscription: checkout.subscription_id,
            amount_total: Number(checkout.amount_total || 0),
            currency: checkout.currency,
            payment_status: checkout.payment_status,
            status: checkout.status,
            created: Math.floor(new Date(checkout.completed_at).getTime() / 1000),
            customer_details: { email: checkout.customer_email },
            customer_email: checkout.customer_email,
            client_reference_id: checkout.client_reference_id || auth.user.id,
          },
          createId,
        ),
      );

      const db = await readDb();
      const nextUser = db.users.find((user) => user.id === auth.user.id) || auth.user;
      return json(buildProfilePayload(db, nextUser));
    } catch (error) {
      return json({ message: error.message || "Unable to confirm checkout" }, { status: 400 });
    }
  }

  if (apiPath === "/billing/portal" && request.method === "POST") {
    const auth = await requireUser(request);
    if (auth.error) {
      return auth.error;
    }

    try {
      const session = await createStripePortalSession({
        customerId: auth.user.stripe_customer_id,
        origin: getCheckoutOrigin(request),
      });
      return json(session);
    } catch (error) {
      return json({ message: error.message || "Unable to open billing portal" }, { status: 400 });
    }
  }

  if (apiPath === "/admin/members" && request.method === "GET") {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const db = await readDb();
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

    return json(members);
  }

  const memberPaymentsMatch = apiPath.match(/^\/admin\/members\/([^/]+)\/payments$/);
  if (memberPaymentsMatch && request.method === "GET") {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const memberId = memberPaymentsMatch[1];
    const db = await readDb();
    const member = db.users.find((user) => user.id === memberId);

    if (!member) {
      return json({ message: "Member not found" }, { status: 404 });
    }

    const payments = db.payments
      .filter((payment) => payment.user_id === memberId)
      .sort((left, right) => {
        const leftTime = new Date(left.payment_date || left.created_at || 0).getTime();
        const rightTime = new Date(right.payment_date || right.created_at || 0).getTime();
        return rightTime - leftTime;
      });

    return json({
      member: {
        id: member.id,
        full_name: member.full_name,
        email: member.email,
        plan: member.plan || "free",
        auth_provider: member.auth_provider || "password",
      },
      payments,
    });
  }

  if (/^\/admin\/members\/[^/]+$/.test(apiPath) && request.method === "PATCH") {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const memberId = apiPath.split("/")[3];
    const updates = await request.json();
    let updatedUser = null;

    await updateDb((current) => ({
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
      return json({ message: "Member not found" }, { status: 404 });
    }

    return json({
      id: updatedUser.id,
      full_name: updatedUser.full_name,
      email: updatedUser.email,
      role: updatedUser.role,
      plan: updatedUser.plan,
    });
  }

  if (/^\/admin\/members\/[^/]+$/.test(apiPath) && request.method === "DELETE") {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const memberId = apiPath.split("/")[3];

    if (auth.user.id === memberId) {
      return json({ message: "You cannot delete your own admin account." }, { status: 400 });
    }

    let deletedUser = null;

    await updateDb((current) => {
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
      return json({ message: "Member not found" }, { status: 404 });
    }

    return new Response(null, { status: 204 });
  }

  if (apiPath === "/ai-tutor/conversations" && request.method === "GET") {
    const auth = await requireUser(request);
    if (auth.error) {
      return auth.error;
    }

    const db = await readDb();
    return json({
      conversations: db.tutorConversations[auth.user.id] || [],
      entitlements: buildUserAccessState(db, auth.user).entitlements,
    });
  }

  if (apiPath === "/ai-tutor/conversations" && request.method === "POST") {
    const auth = await requireUser(request);
    if (auth.error) {
      return auth.error;
    }

    const body = await request.json();
    const conversation = {
      id: createId("convo"),
      metadata: { name: body?.name || "New Chat" },
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await updateDb((current) => {
      const currentConversations = current.tutorConversations[auth.user.id] || [];
      return {
        ...current,
        tutorConversations: {
          ...current.tutorConversations,
          [auth.user.id]: [conversation, ...currentConversations],
        },
      };
    });

    const db = await readDb();
    return json(
      {
        conversation,
        entitlements: buildUserAccessState(db, auth.user).entitlements,
      },
      { status: 201 },
    );
  }

  const tutorStreamMatch = apiPath.match(/^\/ai-tutor\/conversations\/([^/]+)\/messages\/stream$/);
  if (tutorStreamMatch && request.method === "POST") {
    const auth = await requireUser(request);
    if (auth.error) return auth.error;

    const content = String((await request.json())?.content || "").trim();
    if (!content) {
      return json({ message: "Message content is required" }, { status: 400 });
    }

    if (!isOpenAIConfigured()) {
      return json(
        {
          message: "Streaming tutor requires OPENAI_API_KEY. Use the non-streaming endpoint as fallback.",
          code: "openai_not_configured",
        },
        { status: 503 },
      );
    }

    const db = await readDb();
    const { entitlements, progress } = buildUserAccessState(db, auth.user);
    if (
      entitlements.ai_tutor_daily_limit !== null &&
      entitlements.usage.tutor_messages_remaining <= 0
    ) {
      return sendPlanLimitReached(
        "ai_tutor_limit",
        entitlements.ai_tutor_daily_limit,
        entitlements.usage.tutor_messages_remaining,
      );
    }

    const conversationId = tutorStreamMatch[1];
    const currentConversation = (db.tutorConversations[auth.user.id] || []).find(
      (conversation) => conversation.id === conversationId,
    );

    if (!currentConversation) {
      return json({ message: "Conversation not found" }, { status: 404 });
    }

    // Persist the user message right away so it survives a stream interrupt.
    const userMessage = {
      id: createId("msg"),
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };

    await updateDb((current) => {
      const list = current.tutorConversations[auth.user.id] || [];
      return {
        ...current,
        tutorConversations: {
          ...current.tutorConversations,
          [auth.user.id]: list.map((conversation) =>
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

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (eventName, data) => {
          controller.enqueue(
            encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        };

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

          await updateDb((current) => {
            const list = current.tutorConversations[auth.user.id] || [];
            return {
              ...current,
              tutorConversations: {
                ...current.tutorConversations,
                [auth.user.id]: list.map((conversation) =>
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

          const nextDb = await readDb();
          sendEvent("done", {
            message: assistantMessage,
            entitlements: buildUserAccessState(nextDb, auth.user).entitlements,
          });
        } catch (error) {
          console.error("[tutor stream netlify] error:", error.message);
          sendEvent("error", { message: error.message || "Stream failed" });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const tutorMatch = apiPath.match(/^\/ai-tutor\/conversations\/([^/]+)\/messages$/);
  if (tutorMatch && request.method === "POST") {
    const auth = await requireUser(request);
    if (auth.error) {
      return auth.error;
    }

    const content = String((await request.json())?.content || "").trim();
    if (!content) {
      return json({ message: "Message content is required" }, { status: 400 });
    }

    const db = await readDb();
    const { entitlements, progress } = buildUserAccessState(db, auth.user);
    if (
      entitlements.ai_tutor_daily_limit !== null &&
      entitlements.usage.tutor_messages_remaining <= 0
    ) {
      return sendPlanLimitReached(
        "ai_tutor_limit",
        entitlements.ai_tutor_daily_limit,
        entitlements.usage.tutor_messages_remaining,
      );
    }

    const conversationId = tutorMatch[1];
    const userMessage = {
      id: createId("msg"),
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    const currentConversation = (db.tutorConversations[auth.user.id] || []).find(
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

    await updateDb((current) => {
      const currentConversations = current.tutorConversations[auth.user.id] || [];
      return {
        ...current,
        tutorConversations: {
          ...current.tutorConversations,
          [auth.user.id]: currentConversations.map((conversation) => {
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
      return json({ message: "Conversation not found" }, { status: 404 });
    }

    const nextDb = await readDb();
    return json(
      {
        conversation: updatedConversation,
        entitlements: buildUserAccessState(nextDb, auth.user).entitlements,
      },
      { status: 201 },
    );
  }

  return json({ message: "Not found" }, { status: 404 });
};
