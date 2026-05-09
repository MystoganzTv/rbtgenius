import { computeProgress } from '../src/lib/backend-core.js';
import {
  baseQuestions, buildFlashcardBank, buildMockExamQuestionSet,
  buildPracticeQuestionBank, evaluateQuestionAnswer, sanitizeQuestions,
  TOTAL_PRACTICE_QUESTIONS, topicLabels,
} from '../src/lib/question-bank.js';
import { buildSession, hashPassword, isSessionExpired, shouldRotateSession, verifyPassword } from '../server/lib/auth.js';
import { buildOAuthAuthorizationUrl, createOAuthState, exchangeOAuthCodeForProfile, listOAuthProviders, normalizeOrigin, normalizeRedirectPath } from '../server/lib/oauth.js';
import { resolveUserRole, ADMIN_EMAILS } from '../server/lib/seed.js';
import { confirmStripeCheckoutSession, constructStripeWebhookEvent, createStripeCheckoutSession, createStripePortalSession, getBillingConfig, resolvePlanFromPriceId } from '../server/lib/billing.js';
import { findUserForBilling, syncConfirmedCheckout, applyStripeWebhookEvent } from '../server/lib/stripe-sync.js';
import { notifyNewMember, notifyNewSubscription, sendVerificationEmail } from '../server/lib/admin-notify.js';
import crypto from 'node:crypto';
import { getEntitlements, isPremiumPlan } from '../src/lib/plan-access.js';
import { createTutorReply, isOpenAIConfigured, streamTutorReplyOpenAI } from '../server/lib/tutor.js';
import * as db from './lib/db.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      ...(init.headers ?? {}),
    },
  });
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// req.url is always a full URL when called through the Node.js adapter below
function parseUrl(req) { return new URL(req.url); }

function readBody(nodeReq) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    nodeReq.on('data', c => chunks.push(c));
    nodeReq.on('end', () => resolve(Buffer.concat(chunks)));
    nodeReq.on('error', reject);
  });
}

function safeUser(user) {
  const { password_hash: _h, password_salt: _s, ...rest } = user;
  return rest;
}

function getToken(req) {
  const h = req.headers.get('authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

function getClientIp(req) {
  return (
    req.headers.get('x-real-ip') ||
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'unknown'
  );
}

function getApiPath(url) {
  const p = new URL(url).pathname;
  return p.replace(/^\/api/, '') || '/';
}

async function buildUserAccessState(user) {
  const [attempts, mockExams] = await Promise.all([
    db.getAttemptsByUser(user.id),
    db.getMockExamsByUser(user.id),
  ]);
  const progress = computeProgress({ attempts, mockExams, users: [user] }, user.id);
  const tutorMsgsToday = await db.countTutorMessagesToday(user.id);
  return {
    progress,
    entitlements: getEntitlements(user.plan, {
      practiceQuestionsToday: progress.questions_today,
      tutorMessagesToday: tutorMsgsToday,
    }),
    billing: getBillingConfig(user),
  };
}

async function buildProfilePayload(user) {
  const { progress, entitlements, billing } = await buildUserAccessState(user);
  const payments = await db.getPaymentsByUser(user.id);
  return {
    user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role, plan: user.plan, stripe_customer_id: user.stripe_customer_id ?? null },
    progress, entitlements, billing, payments,
  };
}

async function requireUser(req) {
  const token = getToken(req);
  if (!token) return { error: json({ message: 'Authentication required', extra_data: { reason: 'auth_required' } }, { status: 401 }) };
  const user = await db.getUserByToken(token);
  if (!user || isSessionExpired(user)) return { error: json({ message: 'Authentication required', extra_data: { reason: 'auth_required' } }, { status: 401 }) };
  return { user };
}

async function requireAdmin(req) {
  const auth = await requireUser(req);
  if (auth.error) return auth;
  if (auth.user.role !== 'admin') return { error: json({ message: 'Admin access required' }, { status: 403 }) };
  return auth;
}

function rateLimited(decision, feature) {
  return json({ message: 'Too many attempts. Please wait and try again.', code: 'rate_limited', feature, retry_after_seconds: decision.retryAfterSeconds },
    { status: 429, headers: { 'Retry-After': String(decision.retryAfterSeconds) } });
}

function sendPremiumRequired(feature) {
  return json({ message: 'Premium membership required', code: 'premium_required', feature }, { status: 403 });
}

function sendPlanLimitReached(feature, limit, remaining) {
  return json({ message: 'Daily plan limit reached', code: 'plan_limit_reached', feature, limit, remaining }, { status: 403 });
}

function getCheckoutOrigin(req) {
  return normalizeOrigin(req.headers.get('origin'), parseUrl(req).origin);
}

// Rate limit helpers that work with Postgres instead of the JSON blob
async function checkRateLimitPg(bucket, identityParts) {
  const BUCKETS = { login: { limit: 5, windowMs: 15 * 60 * 1000 }, register: { limit: 3, windowMs: 60 * 60 * 1000 } };
  const config = BUCKETS[bucket];
  if (!config) return { allowed: true, remaining: Infinity, retryAfterSeconds: 0 };
  const key = `${bucket}:${identityParts.filter(Boolean).join(':').toLowerCase()}`;
  const stored = await db.getRateLimitDb([key]);
  const entry = stored[key];
  const now = Date.now();
  const expiresAtMs = entry ? new Date(entry.expires_at).getTime() : 0;
  const isActive = entry && expiresAtMs > now;
  const count = isActive ? entry.count : 0;
  if (count >= config.limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((expiresAtMs - now) / 1000)), limit: config.limit };
  }
  return { allowed: true, remaining: config.limit - count, retryAfterSeconds: 0, limit: config.limit, config };
}

async function recordRateLimitPg(bucket, identityParts) {
  const BUCKETS = { login: { limit: 5, windowMs: 15 * 60 * 1000 }, register: { limit: 3, windowMs: 60 * 60 * 1000 } };
  const config = BUCKETS[bucket];
  if (!config) return;
  const key = `${bucket}:${identityParts.filter(Boolean).join(':').toLowerCase()}`;
  const stored = await db.getRateLimitDb([key]);
  const entry = stored[key];
  const now = Date.now();
  const expiresAtMs = entry ? new Date(entry.expires_at).getTime() : 0;
  const isActive = entry && expiresAtMs > now;
  const next = isActive
    ? { ...entry, count: entry.count + 1 }
    : { count: 1, first_attempt_at: new Date(now).toISOString(), expires_at: new Date(now + config.windowMs).toISOString() };
  await db.setRateLimitDb(key, next);
}

async function clearRateLimitPg(bucket, identityParts) {
  const key = `${bucket}:${identityParts.filter(Boolean).join(':').toLowerCase()}`;
  await db.deleteRateLimitKey(key);
}

function applyQuestionFilters(questions, searchParams) {
  const topic = searchParams.get('topic') || 'all';
  const difficulty = searchParams.get('difficulty') || 'all';
  const limit = Number(searchParams.get('limit') || 0);
  const offset = Math.max(0, Number(searchParams.get('offset') || 0));
  const filtered = questions.filter(q =>
    (topic === 'all' || q.topic === topic) && (difficulty === 'all' || q.difficulty === difficulty)
  );
  if (limit > 0) return filtered.slice(offset, offset + limit);
  return offset > 0 ? filtered.slice(offset) : filtered;
}

function getQuestionBank(mode, options = {}) {
  const { seed, size, excludeIds } = options;
  if (mode === 'flashcards') return buildFlashcardBank(size || TOTAL_PRACTICE_QUESTIONS, seed);
  if (mode === 'mock') return buildMockExamQuestionSet(size || 85, null, seed, { excludeIds });
  if (mode === 'base') return baseQuestions;
  return buildPracticeQuestionBank(size || TOTAL_PRACTICE_QUESTIONS, seed, { excludeIds });
}

async function upsertOAuthUser(profile, providerId) {
  const existing = await db.getUserByEmail(profile.email);
  const session = buildSession();
  let user;
  let wasCreated = false;

  if (existing) {
    user = await db.updateUser(existing.id, {
      full_name: existing.full_name || profile.name,
      role: resolveUserRole(existing.email, existing.role),
      token: session.token,
      token_issued_at: session.issued_at,
      token_expires_at: session.expires_at,
      oauth_accounts: {
        ...(existing.oauth_accounts ?? {}),
        [providerId]: { id: profile.id, email: profile.email, linked_at: new Date().toISOString() },
      },
    });
  } else {
    user = await db.createUser({
      id: createId('user'),
      full_name: profile.name,
      email: profile.email.toLowerCase(),
      created_at: new Date().toISOString(),
      role: resolveUserRole(profile.email),
      plan: 'free',
      token: session.token,
      token_issued_at: session.issued_at,
      token_expires_at: session.expires_at,
      auth_provider: providerId,
      oauth_accounts: { [providerId]: { id: profile.id, email: profile.email, linked_at: new Date().toISOString() } },
    });
    wasCreated = true;
  }

  return { token: session.token, expires_at: session.expires_at, user: safeUser(user), created: wasCreated };
}

// ── Web API handler (uses Request/Response) ───────────────────────────────────

async function webApiHandler(req) {
  if (req.method === 'OPTIONS') return json({}, { status: 204 });

  const url = parseUrl(req);
  const apiPath = getApiPath(req.url);

  // ── Debug endpoint (remove after confirming setup works) ─────────────────
  if (apiPath === '/debug' && req.method === 'GET') {
    const checks = {
      database_url: !!process.env.DATABASE_URL,
      db_host: process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : null,
    };
    try {
      const rows = await db.sql`SELECT 1 AS ok`;
      checks.db_connected = rows[0]?.ok === 1;
    } catch (e) {
      checks.db_error = e.message;
    }
    try {
      const tables = await db.sql`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = ANY(ARRAY['users','attempts','mock_exams','payments',
          'practice_sessions','tutor_conversations','tutor_messages',
          'push_tokens','stripe_events','oauth_states','rate_limits'])
        ORDER BY table_name
      `;
      const found = tables.map(r => r.table_name);
      const required = ['users','attempts','mock_exams','payments','practice_sessions',
        'tutor_conversations','tutor_messages','push_tokens','stripe_events','oauth_states','rate_limits'];
      const missing = required.filter(t => !found.includes(t));
      checks.tables_found = found;
      checks.tables_missing = missing;
      checks.schema_ok = missing.length === 0;
    } catch (e) {
      checks.tables_error = e.message;
    }
    try {
      const rows = await db.sql`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS new_this_week FROM users`;
      checks.users_total = rows[0]?.total ?? 0;
      checks.users_new_this_week = rows[0]?.new_this_week ?? 0;
    } catch (e) {
      checks.users_error = e.message;
    }
    return json(checks);
  }

  // ── Stripe webhook ──────────────────────────────────────────────────────────
  if (apiPath === '/billing/webhook' && req.method === 'POST') {
    try {
      const payload = await req.text();
      const event = constructStripeWebhookEvent(payload, req.headers.get('stripe-signature'));
      if (await db.hasStripeEvent(event.id)) return json({ received: true, duplicate: true });
      await db.saveStripeEvent(event.id);

      if (event.type === 'checkout.session.completed') {
        const checkout = event.data?.object || {};
        const allUsers = await db.getAllUsers();
        const allPayments = await db.getAllPayments();
        const mockCurrentDb = { users: allUsers, payments: allPayments };
        const mockNext = applyStripeWebhookEvent(mockCurrentDb, event, createId);
        for (const u of mockNext.users) {
          const orig = allUsers.find(x => x.id === u.id);
          if (orig && (orig.plan !== u.plan || orig.stripe_customer_id !== u.stripe_customer_id))
            await db.updateUser(u.id, { plan: u.plan, stripe_customer_id: u.stripe_customer_id });
        }
        for (const p of mockNext.payments) {
          if (!allPayments.find(x => x.id === p.id)) await db.createPayment(p);
        }
        const user = findUserForBilling({ users: mockNext.users, payments: mockNext.payments }, {
          userId: checkout.client_reference_id,
          customerId: typeof checkout.customer === 'string' ? checkout.customer : checkout.customer?.id,
          email: checkout.customer_details?.email || checkout.customer_email,
        });
        if (user) await notifyNewSubscription({ user, plan: checkout.metadata?.plan || user.plan, checkout });
      }

      if (event.type === 'customer.subscription.deleted') {
        const sub = event.data?.object || {};
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
        const user = await db.getUserByStripeCustomerId(customerId);
        if (user) {
          await db.updateUser(user.id, { plan: 'free' });
          console.log(`[webhook] Subscription cancelled — downgraded ${user.email} to free`);
        }
      }

      if (event.type === 'customer.subscription.updated') {
        const sub = event.data?.object || {};
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
        const user = await db.getUserByStripeCustomerId(customerId);
        if (user && sub.status === 'active') {
          const priceId = sub.items?.data?.[0]?.price?.id;
          const plan = resolvePlanFromPriceId(priceId);
          if (plan && plan !== 'free') {
            await db.updateUser(user.id, { plan });
            console.log(`[webhook] Subscription updated — ${user.email} → ${plan}`);
          }
        }
        if (user && (sub.status === 'canceled' || sub.status === 'unpaid')) {
          await db.updateUser(user.id, { plan: 'free' });
          console.log(`[webhook] Subscription ${sub.status} — downgraded ${user.email} to free`);
        }
      }

      if (event.type === 'invoice.paid') {
        const invoice = event.data?.object || {};
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        const user = await db.getUserByStripeCustomerId(customerId);
        if (user && invoice.billing_reason === 'subscription_cycle') {
          // Recurring renewal — ensure plan stays active
          const priceId = invoice.lines?.data?.[0]?.price?.id;
          const plan = resolvePlanFromPriceId(priceId);
          if (plan && plan !== 'free' && user.plan !== plan) {
            await db.updateUser(user.id, { plan });
          }
          // Record renewal payment
          await db.createPayment({
            id: createId('pay'),
            user_id: user.id,
            status: 'completed',
            amount: (invoice.amount_paid || 0) / 100,
            payment_date: new Date((invoice.created || Date.now() / 1000) * 1000).toISOString(),
            created_at: new Date().toISOString(),
            metadata: { invoice_id: invoice.id, reason: 'subscription_renewal' },
          });
          console.log(`[webhook] Renewal payment recorded for ${user.email}`);
        }
      }

      if (event.type === 'invoice.payment_failed') {
        const invoice = event.data?.object || {};
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        const user = await db.getUserByStripeCustomerId(customerId);
        if (user) {
          console.warn(`[webhook] Payment failed for ${user.email} — invoice ${invoice.id}`);
          // Stripe will retry — we don't downgrade immediately
        }
      }

      return json({ received: true });
    } catch (err) {
      return json({ message: err.message || 'Invalid Stripe webhook event' }, { status: 400 });
    }
  }

  // ── Public routes ───────────────────────────────────────────────────────────
  if (apiPath === '/health' && req.method === 'GET') return json({ ok: true });
  if (apiPath === '/public-settings' && req.method === 'GET') return json({ auth_required: true, app_name: 'RBT Genius', billing: getBillingConfig() });
  if (apiPath === '/auth/providers' && req.method === 'GET') return json({ providers: listOAuthProviders() });

  // ── OAuth start ─────────────────────────────────────────────────────────────
  if (req.method === 'GET' && /^\/auth\/oauth\/[^/]+\/start$/.test(apiPath)) {
    const providerId = apiPath.split('/')[3];
    const redirectTo = normalizeRedirectPath(url.searchParams.get('redirectTo'));
    const frontendOrigin = normalizeOrigin(url.searchParams.get('origin'), url.origin);
    const state = createOAuthState();
    try {
      await db.saveOAuthState(state, { provider_id: providerId, frontend_origin: frontendOrigin, redirect_to: redirectTo, created_at: new Date().toISOString() });
      return Response.redirect(buildOAuthAuthorizationUrl({ providerId, state, backendOrigin: url.origin }), 302);
    } catch (err) {
      const loginUrl = new URL('/login', frontendOrigin);
      loginUrl.searchParams.set('oauthError', err.message || 'Unable to start sign-in');
      if (redirectTo) loginUrl.searchParams.set('redirectTo', redirectTo);
      return Response.redirect(loginUrl.toString(), 302);
    }
  }

  // ── OAuth callback ──────────────────────────────────────────────────────────
  if ((req.method === 'GET' || req.method === 'POST') && /^\/auth\/oauth\/[^/]+\/callback$/.test(apiPath)) {
    const providerId = apiPath.split('/')[3];
    let callbackParams;
    if (req.method === 'POST') {
      const ct = req.headers.get('content-type') || '';
      callbackParams = ct.includes('application/json') ? await req.json() : Object.fromEntries(new URLSearchParams(await req.text()));
    } else {
      callbackParams = Object.fromEntries(url.searchParams.entries());
    }
    const stateRecord = await db.consumeOAuthState(String(callbackParams.state || ''));
    const frontendOrigin = stateRecord?.frontend_origin || url.origin;
    const redirectTo = stateRecord?.redirect_to || '/';
    const loginUrl = (params = {}) => {
      const u = new URL('/login', frontendOrigin);
      if (redirectTo) u.searchParams.set('redirectTo', normalizeRedirectPath(redirectTo));
      Object.entries(params).forEach(([k, v]) => { if (v) u.searchParams.set(k, v); });
      return u.toString();
    };
    if (!stateRecord || stateRecord.provider_id !== providerId) return Response.redirect(loginUrl({ oauthError: 'Your sign-in session expired. Please try again.' }), 302);
    if (callbackParams.error) return Response.redirect(loginUrl({ oauthError: callbackParams.error_description || callbackParams.error }), 302);
    try {
      const profile = await exchangeOAuthCodeForProfile({ providerId, code: String(callbackParams.code || ''), backendOrigin: url.origin, callbackParams });
      const authData = await upsertOAuthUser(profile, providerId);
      if (authData.created) await notifyNewMember(authData.user, { source: 'oauth', authProvider: providerId });
      return Response.redirect(loginUrl({ authToken: authData.token }), 302);
    } catch (err) {
      console.error('[oauth callback]', providerId, err.message);
      return Response.redirect(loginUrl({ oauthError: err.message || 'Unable to complete sign-in' }), 302);
    }
  }

  // ── Native Google Sign-In ───────────────────────────────────────────────────
  if (apiPath === '/auth/google' && req.method === 'POST') {
    const body = await req.json();
    const idToken = String(body?.id_token || '').trim();
    if (!idToken) return json({ message: 'id_token is required' }, { status: 400 });
    try {
      const tokenRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || tokenData.error) return json({ message: 'Invalid Google token' }, { status: 401 });
      const ALLOWED = ['37632251231-cc6t4d7beofa9l8h14shg14epdtpflgr.apps.googleusercontent.com', '37632251231-th4qu526qnm34f3uitq7m363dolsu1f0.apps.googleusercontent.com'];
      if (!ALLOWED.includes(tokenData.aud)) return json({ message: 'Token audience mismatch' }, { status: 401 });
      const profile = { id: tokenData.sub, email: String(tokenData.email || '').trim().toLowerCase(), name: tokenData.name || tokenData.email };
      if (!profile.email) return json({ message: 'Google did not return an email address' }, { status: 401 });
      const authData = await upsertOAuthUser(profile, 'google');
      if (authData.created) await notifyNewMember(authData.user, { source: 'google_native', authProvider: 'google' });
      return json({ token: authData.token, user: authData.user });
    } catch (err) {
      return json({ message: err.message || 'Google sign-in failed' }, { status: 500 });
    }
  }

  // ── Register ────────────────────────────────────────────────────────────────
  if (apiPath === '/auth/register' && req.method === 'POST') {
    const body = await req.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const fullName = String(body?.full_name || '').trim();
    const ip = getClientIp(req);
    const check = await checkRateLimitPg('register', [ip]);
    if (!check.allowed) return rateLimited(check, 'register');
    if (!email || !password || !fullName) { await recordRateLimitPg('register', [ip]); return json({ message: 'Full name, email, and password are required' }, { status: 400 }); }
    if (password.length < 8) { await recordRateLimitPg('register', [ip]); return json({ message: 'Password must be at least 8 characters' }, { status: 400 }); }
    if (await db.getUserByEmail(email)) { await recordRateLimitPg('register', [ip]); return json({ message: 'An account with that email already exists' }, { status: 409 }); }
    const passwordData = hashPassword(password);
    const newUser = await db.createUser({
      id: createId('user'), full_name: fullName, email, created_at: new Date().toISOString(),
      role: resolveUserRole(email), plan: 'free', token: null,
      token_issued_at: null, token_expires_at: null,
      auth_provider: 'password', oauth_accounts: {},
      password_hash: passwordData.hash, password_salt: passwordData.salt,
    });
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await db.updateUser(newUser.id, { email_verified: false, email_verification_token: verificationToken });
    await recordRateLimitPg('register', [ip]);
    await notifyNewMember(safeUser(newUser), { source: 'manual_register', authProvider: 'password' });
    await sendVerificationEmail(safeUser(newUser), verificationToken, url.origin);
    return json({ message: 'Account created. Please check your email to verify your account.' }, { status: 201 });
  }

  // ── Login ───────────────────────────────────────────────────────────────────
  if (apiPath === '/auth/login' && req.method === 'POST') {
    const body = await req.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const ip = getClientIp(req);
    const check = await checkRateLimitPg('login', [ip, email]);
    if (!check.allowed) return rateLimited(check, 'login');
    const user = await db.getUserByEmail(email);
    if (!user || !user.password_hash || !user.password_salt || !verifyPassword(password, user.password_salt, user.password_hash)) {
      await recordRateLimitPg('login', [ip, email]);
      return json({ message: 'Invalid email or password' }, { status: 401 });
    }
    if (user.email_verified === false) {
      return json({ message: 'Please verify your email before signing in. Check your inbox.' }, { status: 403 });
    }
    const session = buildSession();
    const updated = await db.updateUser(user.id, { role: resolveUserRole(user.email, user.role), token: session.token, token_issued_at: session.issued_at, token_expires_at: session.expires_at });
    await clearRateLimitPg('login', [ip, email]);
    return json({ token: session.token, expires_at: session.expires_at, user: safeUser(updated) });
  }

  // ── Auth/me ─────────────────────────────────────────────────────────────────
  if (apiPath === '/auth/me' && req.method === 'GET') {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    const correctRole = resolveUserRole(auth.user.email, auth.user.role);
    const needsRoleUpdate = auth.user.role !== correctRole;
    if (shouldRotateSession(auth.user) || needsRoleUpdate) {
      const session = shouldRotateSession(auth.user) ? buildSession() : null;
      const rotated = await db.updateUser(auth.user.id, {
        role: correctRole,
        ...(session ? { token: session.token, token_issued_at: session.issued_at, token_expires_at: session.expires_at } : {}),
      });
      if (session) return json({ ...safeUser(rotated), token: session.token, expires_at: session.expires_at });
      return json({ ...safeUser(rotated), expires_at: auth.user.token_expires_at });
    }
    return json({ ...safeUser(auth.user), expires_at: auth.user.token_expires_at });
  }

  // ── Logout ──────────────────────────────────────────────────────────────────
  if (apiPath === '/auth/logout' && req.method === 'POST') {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    await db.clearUserSession(auth.user.id);
    return json({ ok: true });
  }

  // ── Verify email ─────────────────────────────────────────────────────────────
  if (apiPath === '/auth/verify-email' && req.method === 'GET') {
    const token = url.searchParams.get('token');
    if (!token) return Response.redirect(new URL('/login?oauthError=Invalid+verification+link', url.origin).toString(), 302);
    try {
      const user = await db.getUserByVerificationToken(token);
      if (!user) return Response.redirect(new URL('/login?oauthError=Verification+link+expired+or+already+used', url.origin).toString(), 302);
      const session = buildSession();
      await db.updateUser(user.id, { email_verified: true, email_verification_token: null, token: session.token, token_issued_at: session.issued_at, token_expires_at: session.expires_at });
      const loginUrl = new URL('/login', url.origin);
      loginUrl.searchParams.set('authToken', session.token);
      loginUrl.searchParams.set('redirectTo', '/dashboard');
      return Response.redirect(loginUrl.toString(), 302);
    } catch (err) {
      console.error('[verify-email]', err.message);
      return Response.redirect(new URL('/login?oauthError=Verification+failed', url.origin).toString(), 302);
    }
  }

  // ── Questions ───────────────────────────────────────────────────────────────
  if (apiPath === '/questions' && req.method === 'GET') {
    const mode = url.searchParams.get('mode') || 'practice';
    if (mode === 'flashcards') {
      const qs = getQuestionBank(mode, { seed: url.searchParams.get('seed'), size: TOTAL_PRACTICE_QUESTIONS });
      return json(applyQuestionFilters(sanitizeQuestions(qs, mode), url.searchParams));
    }
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    if (mode === 'mock' && !isPremiumPlan(auth.user.plan)) return sendPremiumRequired('mock_exams');
    const size = Number(url.searchParams.get('limit') || 0) || (mode === 'mock' ? 85 : TOTAL_PRACTICE_QUESTIONS);
    const excludeIds = mode === 'mock'
      ? await db.getMockAttemptIdsByUser(auth.user.id)
      : await db.getPracticeAttemptIdsByUser(auth.user.id);
    const qs = getQuestionBank(mode, { seed: url.searchParams.get('seed'), size, excludeIds });
    return json(applyQuestionFilters(sanitizeQuestions(qs, mode), url.searchParams));
  }

  // ── Practice session ────────────────────────────────────────────────────────
  if (apiPath === '/practice/session') {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    if (req.method === 'GET') return json(await db.getPracticeSession(auth.user.id));
    if (req.method === 'PUT') { const data = await req.json(); await db.upsertPracticeSession(auth.user.id, data); return json(data); }
    if (req.method === 'DELETE') { await db.deletePracticeSession(auth.user.id); return new Response(null, { status: 204 }); }
  }

  // ── Question attempts ───────────────────────────────────────────────────────
  if (apiPath === '/question-attempts' && req.method === 'GET') {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    return json(await db.getAttemptsByUser(auth.user.id));
  }

  if (apiPath === '/question-attempts' && req.method === 'POST') {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    const { entitlements } = await buildUserAccessState(auth.user);
    if (entitlements.practice_daily_limit !== null && entitlements.usage.practice_questions_remaining <= 0)
      return sendPlanLimitReached('practice_limit', entitlements.practice_daily_limit, entitlements.usage.practice_questions_remaining);
    const body = await req.json();
    const evaluation = evaluateQuestionAnswer(body?.question_id, body?.selected_answer);
    if (!evaluation) return json({ message: 'Question not found' }, { status: 400 });
    const attempt = await db.createAttempt({
      id: createId('attempt'), user_id: auth.user.id, created_at: new Date().toISOString(),
      question_id: evaluation.question_id, selected_answer: evaluation.selected_answer,
      is_correct: evaluation.is_correct, topic: evaluation.topic, source: body?.source || 'practice',
    });
    const { entitlements: newEnt } = await buildUserAccessState(auth.user);
    return json({ ...attempt, correct_answer: evaluation.correct_answer, explanation: evaluation.explanation, entitlements: newEnt }, { status: 201 });
  }

  // ── Mock exams ──────────────────────────────────────────────────────────────
  if (apiPath === '/mock-exams' && req.method === 'GET') {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    if (!isPremiumPlan(auth.user.plan)) return sendPremiumRequired('mock_exams');
    return json(await db.getMockExamsByUser(auth.user.id));
  }

  if (apiPath === '/mock-exams' && req.method === 'POST') {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    if (!isPremiumPlan(auth.user.plan)) return sendPremiumRequired('mock_exams');
    const body = await req.json();
    const questionIds = Array.isArray(body?.question_ids) ? body.question_ids : [];
    const answers = body?.answers || {};
    const questions = questionIds.map(qid => evaluateQuestionAnswer(qid, answers[qid])).filter(Boolean);
    if (questions.length === 0) return json({ message: 'Mock exam questions are required' }, { status: 400 });
    const correct = questions.filter(q => q.is_correct).length;
    const score = Math.round((correct / questions.length) * 100);
    const domainScores = {};
    Object.keys(topicLabels).forEach(key => {
      const tqs = questions.filter(q => q.topic === key);
      domainScores[key] = tqs.length > 0 ? Math.round((tqs.filter(q => q.is_correct).length / tqs.length) * 100) : 0;
    });
    const exam = await db.createMockExam({
      id: createId('mock_exam'), user_id: auth.user.id, created_at: new Date().toISOString(),
      score, total_questions: questions.length, correct_answers: correct,
      time_taken_minutes: Number(body?.time_taken_minutes || 0), status: 'completed',
      answers: questions.map(({ question_id, selected_answer, is_correct }) => ({ question_id, selected_answer, is_correct })),
      passed: score >= 80, domain_scores: domainScores,
    });
    const parsed = typeof exam.domain_scores === 'string' ? JSON.parse(exam.domain_scores) : exam.domain_scores;
    return json({ ...exam, domain_scores: parsed }, { status: 201 });
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────
  if (apiPath === '/dashboard' && req.method === 'GET') {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    const { progress, entitlements, billing } = await buildUserAccessState(auth.user);
    const exams = await db.getMockExamsByUser(auth.user.id);
    return json({ progress, entitlements, billing, allQuestionsCount: TOTAL_PRACTICE_QUESTIONS, exams });
  }

  // ── Analytics ───────────────────────────────────────────────────────────────
  if (apiPath === '/analytics' && req.method === 'GET') {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    if (!isPremiumPlan(auth.user.plan)) return sendPremiumRequired('analytics');
    const [attempts, exams] = await Promise.all([db.getAttemptsByUser(auth.user.id), db.getMockExamsByUser(auth.user.id)]);
    const progress = computeProgress({ attempts, mockExams: exams, users: [auth.user] }, auth.user.id);
    return json({ progress, attempts, exams });
  }

  // ── Profile ─────────────────────────────────────────────────────────────────
  if (apiPath === '/profile' && req.method === 'GET') {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    return json(await buildProfilePayload(auth.user));
  }

  if (apiPath === '/profile' && req.method === 'PATCH') {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    const updates = await req.json();
    const updated = await db.updateUser(auth.user.id, { full_name: updates.full_name ?? auth.user.full_name, role: resolveUserRole(auth.user.email, auth.user.role) });
    return json(safeUser(updated));
  }

  if (apiPath === '/profile/reset-progress' && req.method === 'POST') {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    const body = await req.json().catch(() => ({}));
    await Promise.all([db.deleteAttemptsByUser(auth.user.id), db.deleteMockExamsByUser(auth.user.id), db.deletePracticeSession(auth.user.id)]);
    if (body?.clear_tutor) await db.deleteTutorConversationsByUser(auth.user.id);
    return json(await buildProfilePayload(auth.user));
  }

  if (apiPath === '/profile/password' && req.method === 'PATCH') {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    const body = await req.json();
    const { current_password, new_password } = body;
    if (!new_password || new_password.length < 8) return json({ message: 'New password must be at least 8 characters' }, { status: 400 });
    const user = auth.user;
    if (user.password_hash && user.password_salt) {
      if (!current_password) return json({ message: 'Current password is required' }, { status: 400 });
      if (!verifyPassword(current_password, user.password_salt, user.password_hash)) return json({ message: 'Current password is incorrect' }, { status: 401 });
    }
    const { hash, salt } = hashPassword(new_password);
    await db.updateUser(user.id, { password_hash: hash, password_salt: salt });
    return json({ ok: true });
  }

  // ── Billing ──────────────────────────────────────────────────────────────────
  if (apiPath === '/billing/checkout' && req.method === 'POST') {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    try {
      const body = await req.json();
      const session = await createStripeCheckoutSession({ plan: body?.plan, user: auth.user, origin: getCheckoutOrigin(req) });
      return json(session, { status: 201 });
    } catch (err) { return json({ message: err.message || 'Unable to start checkout' }, { status: 400 }); }
  }

  if (apiPath === '/billing/confirm' && req.method === 'POST') {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    try {
      const { session_id: sessionId } = await req.json();
      if (!sessionId) return json({ message: 'Checkout session is required' }, { status: 400 });
      const checkout = await confirmStripeCheckoutSession(sessionId);
      const ownsSession = checkout.client_reference_id === auth.user.id || String(checkout.customer_email || '').toLowerCase() === auth.user.email.toLowerCase();
      if (!ownsSession) return json({ message: 'This checkout session does not belong to you' }, { status: 403 });
      const allUsers = await db.getAllUsers();
      const allPayments = await db.getAllPayments();
      const mockDb = { users: allUsers, payments: allPayments };
      const mockEvent = { id: sessionId, metadata: { plan: checkout.plan, user_id: auth.user.id }, customer: checkout.customer_id, subscription: checkout.subscription_id, amount_total: Number(checkout.amount_total || 0), currency: checkout.currency, payment_status: checkout.payment_status, status: checkout.status, created: Math.floor(new Date(checkout.completed_at).getTime() / 1000), customer_details: { email: checkout.customer_email }, customer_email: checkout.customer_email, client_reference_id: checkout.client_reference_id || auth.user.id };
      const next = syncConfirmedCheckout(mockDb, mockEvent, createId);
      for (const u of next.users) {
        const orig = allUsers.find(x => x.id === u.id);
        if (orig && (orig.plan !== u.plan || orig.stripe_customer_id !== u.stripe_customer_id))
          await db.updateUser(u.id, { plan: u.plan, stripe_customer_id: u.stripe_customer_id });
      }
      for (const p of next.payments) { if (!allPayments.find(x => x.id === p.id)) await db.createPayment(p); }
      const freshUser = await db.getUserById(auth.user.id);
      return json(await buildProfilePayload(freshUser));
    } catch (err) { return json({ message: err.message || 'Unable to confirm checkout' }, { status: 400 }); }
  }

  if (apiPath === '/billing/portal' && req.method === 'POST') {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    try {
      const session = await createStripePortalSession({ customerId: auth.user.stripe_customer_id, origin: getCheckoutOrigin(req) });
      return json(session);
    } catch (err) { return json({ message: err.message || 'Unable to open billing portal' }, { status: 400 }); }
  }

  // ── Admin ────────────────────────────────────────────────────────────────────
  if (apiPath === '/admin/metrics' && req.method === 'GET') {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;
    try {
      const allUsers = await db.getAllUsers();
      const now = new Date();
      const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
      const total = allUsers.length;
      const premium = allUsers.filter(u => u.plan && u.plan !== 'free').length;
      const newThisWeek = allUsers.filter(u => u.created_at >= sevenDaysAgo).length;
      const activeThisMonth = allUsers.filter(u => u.token_issued_at && u.token_issued_at >= thirtyDaysAgo).length;
      const inactiveCount = allUsers.filter(u => !u.token_issued_at || u.token_issued_at < thirtyDaysAgo).length;
      const conversionRate = total > 0 ? Math.round((premium / total) * 100) : 0;
      return json({ total, premium, newThisWeek, activeThisMonth, inactiveCount, conversionRate });
    } catch (err) {
      console.error('[admin/metrics]', err.message);
      return json({ message: err.message }, { status: 500 });
    }
  }

  if (apiPath === '/admin/members' && req.method === 'GET') {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;
    try {
      const allUsers = await db.getAllUsers();
      if (allUsers.length === 0) return json([]);
      const userIds = allUsers.map(u => u.id);
      // Bulk fetch — 4 queries total regardless of user count
      const [allAttempts, allExams, allPayments] = await Promise.all([
        db.getAttemptsByUserIds(userIds).catch(() => []),
        db.getMockExamsByUserIds(userIds).catch(() => []),
        db.getPaymentsByUserIds(userIds).catch(() => []),
      ]);
      const members = allUsers.map(user => {
        const attempts = allAttempts.filter(a => a.user_id === user.id);
        const exams = allExams.filter(e => e.user_id === user.id);
        const payments = allPayments.filter(p => p.user_id === user.id);
        const progress = computeProgress({ attempts, mockExams: exams, users: [user] }, user.id);
        const completedPayments = payments.filter(p => p.status === 'completed');
        const totalPaid = completedPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
        const latestPayment = [...payments].sort((a, b) => new Date(b.payment_date || b.created_at || 0) - new Date(a.payment_date || a.created_at || 0))[0];
        return {
          id: user.id, full_name: user.full_name, email: user.email, created_at: user.created_at,
          auth_provider: user.auth_provider, role: resolveUserRole(user.email, user.role),
          plan: user.plan, study_streak_days: progress.study_streak_days,
          readiness_score: progress.readiness_score, total_questions_completed: progress.total_questions_completed,
          attempts_count: attempts.length, exams_count: exams.length, last_study_date: progress.last_study_date,
          questions_today: progress.questions_today,
          payments_count: payments.length, total_paid_amount: Number(totalPaid.toFixed(2)),
          last_payment_date: latestPayment?.payment_date || latestPayment?.created_at || null,
          last_login: user.token_issued_at || null,
        };
      });
      return json(members);
    } catch (err) {
      console.error('[admin/members]', err.message);
      return json({ message: err.message || 'Failed to load members' }, { status: 500 });
    }
  }

  const memberPaymentsMatch = apiPath.match(/^\/admin\/members\/([^/]+)\/payments$/);
  if (memberPaymentsMatch && req.method === 'GET') {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;
    const member = await db.getUserById(memberPaymentsMatch[1]);
    if (!member) return json({ message: 'Member not found' }, { status: 404 });
    const payments = (await db.getPaymentsByUser(member.id)).sort((a, b) => new Date(b.payment_date || b.created_at || 0) - new Date(a.payment_date || a.created_at || 0));
    return json({ member: { id: member.id, full_name: member.full_name, email: member.email, plan: member.plan, auth_provider: member.auth_provider }, payments });
  }

  const memberEmailMatch = apiPath.match(/^\/admin\/members\/([^/]+)\/email$/);
  if (memberEmailMatch && req.method === 'POST') {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;
    const member = await db.getUserById(memberEmailMatch[1]);
    if (!member) return json({ message: 'Member not found' }, { status: 404 });
    const body = await req.json();
    const subject = String(body.subject || '').trim();
    const message = String(body.message || '').trim();
    if (!subject || !message) return json({ message: 'Subject and message are required' }, { status: 400 });
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return json({ message: 'Email service not configured' }, { status: 503 });
    const from = process.env.ADMIN_NOTIFICATION_FROM_EMAIL || 'RBT Genius <onboarding@resend.dev>';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: member.email,
        subject,
        html: `<div style="font-family:Inter,Arial,sans-serif;padding:24px;background:#f8fafc;color:#0f172a;"><div style="max-width:560px;margin:0 auto;background:white;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;"><div style="padding:20px 24px;background:#1e5eff;color:white;"><div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;opacity:.8;">RBT Genius</div><h1 style="margin:8px 0 0;font-size:22px;">${subject}</h1></div><div style="padding:28px 24px;white-space:pre-wrap;line-height:1.6;">${message}</div></div></div>`,
        text: message,
      }),
    });
    if (!res.ok) return json({ message: 'Failed to send email' }, { status: 500 });
    return json({ ok: true });
  }

  if (/^\/admin\/members\/[^/]+$/.test(apiPath) && req.method === 'PATCH') {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;
    const memberId = apiPath.split('/')[3];
    const updates = await req.json();
    const member = await db.getUserById(memberId);
    if (!member) return json({ message: 'Member not found' }, { status: 404 });
    const updated = await db.updateUser(memberId, {
      full_name: updates.full_name ?? member.full_name,
      role: resolveUserRole(member.email, ['admin', 'student'].includes(updates.role) ? updates.role : member.role),
      plan: ['premium_monthly', 'premium_yearly', 'free'].includes(updates.plan) ? updates.plan : member.plan,
    });
    return json({ id: updated.id, full_name: updated.full_name, email: updated.email, role: updated.role, plan: updated.plan });
  }

  if (/^\/admin\/members\/[^/]+$/.test(apiPath) && req.method === 'DELETE') {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;
    const memberId = apiPath.split('/')[3];
    if (auth.user.id === memberId) return json({ message: 'You cannot delete your own admin account.' }, { status: 400 });
    const member = await db.getUserById(memberId);
    if (!member) return json({ message: 'Member not found' }, { status: 404 });
    await db.deleteUser(memberId);
    return new Response(null, { status: 204 });
  }

  // ── Push tokens ──────────────────────────────────────────────────────────────
  if (apiPath === '/push-tokens' && req.method === 'POST') {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    const { token: pushToken, platform } = await req.json().catch(() => ({}));
    if (!pushToken || typeof pushToken !== 'string') return json({ message: 'token is required' }, { status: 400 });
    await db.upsertPushToken(auth.user.id, pushToken, platform);
    return json({ ok: true });
  }

  if (apiPath === '/push-tokens' && req.method === 'DELETE') {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    await db.deletePushToken(auth.user.id);
    return new Response(null, { status: 204 });
  }

  // ── AI Tutor ─────────────────────────────────────────────────────────────────
  if (apiPath === '/ai-tutor/conversations' && req.method === 'GET') {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    const [conversations, { entitlements }] = await Promise.all([db.getTutorConversationsByUser(auth.user.id), buildUserAccessState(auth.user)]);
    return json({ conversations, entitlements });
  }

  if (apiPath === '/ai-tutor/conversations' && req.method === 'POST') {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    const body = await req.json();
    const convId = createId('convo');
    const now = new Date().toISOString();
    await db.createTutorConversation(auth.user.id, convId, body?.name || 'New Chat', now);
    const { entitlements } = await buildUserAccessState(auth.user);
    return json({ conversation: { id: convId, metadata: { name: body?.name || 'New Chat' }, messages: [], createdAt: now, updatedAt: now }, entitlements }, { status: 201 });
  }

  const tutorStreamMatch = apiPath.match(/^\/ai-tutor\/conversations\/([^/]+)\/messages\/stream$/);
  if (tutorStreamMatch && req.method === 'POST') {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    if (!isOpenAIConfigured()) return json({ message: 'Streaming tutor requires OPENAI_API_KEY.', code: 'openai_not_configured' }, { status: 503 });
    const content = String((await req.json())?.content || '').trim();
    if (!content) return json({ message: 'Message content is required' }, { status: 400 });
    const { entitlements, progress } = await buildUserAccessState(auth.user);
    if (entitlements.ai_tutor_daily_limit !== null && entitlements.usage.tutor_messages_remaining <= 0)
      return sendPlanLimitReached('ai_tutor_limit', entitlements.ai_tutor_daily_limit, entitlements.usage.tutor_messages_remaining);
    const convId = tutorStreamMatch[1];
    const conversation = await db.getTutorConversation(convId, auth.user.id);
    if (!conversation) return json({ message: 'Conversation not found' }, { status: 404 });
    const userMsg = { id: createId('msg'), conversation_id: convId, user_id: auth.user.id, role: 'user', content, created_at: new Date().toISOString(), autoName: content.slice(0, 50) };
    await db.addTutorMessage(userMsg);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (ev, data) => controller.enqueue(encoder.encode(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`));
        let fullContent = '';
        try {
          for await (const chunk of streamTutorReplyOpenAI({ content, history: conversation.messages, progress })) {
            if (chunk.delta) send('delta', { content: chunk.delta });
            if (chunk.done) fullContent = chunk.fullContent || fullContent;
          }
          const asstMsg = { id: createId('msg'), conversation_id: convId, user_id: auth.user.id, role: 'assistant', content: fullContent, created_at: new Date().toISOString() };
          await db.addTutorMessage(asstMsg);
          const { entitlements: newEnt } = await buildUserAccessState(auth.user);
          send('done', { message: { id: asstMsg.id, role: 'assistant', content: fullContent, created_at: asstMsg.created_at }, entitlements: newEnt });
        } catch (err) {
          send('error', { message: err.message || 'Stream failed' });
        } finally { controller.close(); }
      },
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no', 'Access-Control-Allow-Origin': '*' } });
  }

  const tutorMatch = apiPath.match(/^\/ai-tutor\/conversations\/([^/]+)\/messages$/);
  if (tutorMatch && req.method === 'POST') {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    const content = String((await req.json())?.content || '').trim();
    if (!content) return json({ message: 'Message content is required' }, { status: 400 });
    const { entitlements, progress } = await buildUserAccessState(auth.user);
    if (entitlements.ai_tutor_daily_limit !== null && entitlements.usage.tutor_messages_remaining <= 0)
      return sendPlanLimitReached('ai_tutor_limit', entitlements.ai_tutor_daily_limit, entitlements.usage.tutor_messages_remaining);
    const convId = tutorMatch[1];
    const conversation = await db.getTutorConversation(convId, auth.user.id);
    if (!conversation) return json({ message: 'Conversation not found' }, { status: 404 });
    const tutorReply = await createTutorReply(content, { history: conversation.messages, progress });
    const userMsg = { id: createId('msg'), conversation_id: convId, user_id: auth.user.id, role: 'user', content, created_at: new Date().toISOString(), autoName: content.slice(0, 50) };
    const asstMsg = { id: createId('msg'), conversation_id: convId, user_id: auth.user.id, role: 'assistant', content: tutorReply.content, created_at: new Date().toISOString(), quiz: tutorReply.quiz, follow_up: tutorReply.followUp };
    await db.addTutorMessage(userMsg);
    await db.addTutorMessage(asstMsg);
    const updatedConv = await db.getTutorConversation(convId, auth.user.id);
    const { entitlements: newEnt } = await buildUserAccessState(auth.user);
    return json({ conversation: updatedConv, entitlements: newEnt }, { status: 201 });
  }

  return json({ message: 'Not found' }, { status: 404 });
}

// ── Node.js adapter for Vercel runtime ───────────────────────────────────────

export default async function handler(nodeReq, nodeRes) {
  const proto = nodeReq.headers['x-forwarded-proto'] || 'https';
  const host  = nodeReq.headers.host || 'localhost';
  const url   = `${proto}://${host}${nodeReq.url}`;

  const body = await readBody(nodeReq);

  const webReq = new Request(url, {
    method: nodeReq.method,
    headers: new Headers(nodeReq.headers),
    body: ['GET', 'HEAD', 'OPTIONS'].includes(nodeReq.method) ? undefined : body,
  });

  let webRes;
  try {
    webRes = await webApiHandler(webReq);
  } catch (err) {
    console.error('[handler]', err);
    nodeRes.statusCode = 500;
    nodeRes.setHeader('Content-Type', 'application/json');
    nodeRes.setHeader('Access-Control-Allow-Origin', '*');
    nodeRes.end(JSON.stringify({ message: err.message || 'Internal server error' }));
    return;
  }

  nodeRes.statusCode = webRes.status;
  webRes.headers.forEach((v, k) => nodeRes.setHeader(k, v));

  if (webRes.body) {
    const reader = webRes.body.getReader();
    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) { nodeRes.end(); return; }
      nodeRes.write(value);
      await pump();
    };
    await pump();
  } else {
    nodeRes.end();
  }
}
