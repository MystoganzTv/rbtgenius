import { defaultUser, DEMO_USER_ID } from "../../src/lib/backend-core.js";

const LEGACY_DEMO_EMAIL = "alex.carter@example.com";
const LEGACY_DEMO_EMAILS = [LEGACY_DEMO_EMAIL, "demo@rbtgenius.app"];
export const ADMIN_EMAILS = ["enrique.padron853@gmail.com"];

export function resolveUserRole(email, fallbackRole = "student") {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  return ADMIN_EMAILS.includes(normalizedEmail) ? "admin" : fallbackRole;
}

export function buildSeedDb() {
  return {
    users: [],
    attempts: [],
    mockExams: [],
    payments: [],
    stripeEvents: {},
    practiceSessions: {},
    oauthStates: {},
    tutorConversations: {},
    customQuestions: [],
    rateLimits: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeDb(db) {
  if (!db || typeof db !== "object") {
    return buildSeedDb();
  }

  const seedDb = buildSeedDb();
  return {
    ...seedDb,
    ...db,
    users:
      Array.isArray(db.users) && db.users.length > 0
        ? db.users
            .filter((user) => {
              const normalizedEmail = String(user.email || "").toLowerCase();
              const isLegacyDemoUser =
                user.id === DEMO_USER_ID ||
                LEGACY_DEMO_EMAILS.includes(normalizedEmail) ||
                user.token === "demo-student-token";

              return !isLegacyDemoUser;
            })
            .map((user) => {
              const hasToken = Boolean(user.token);
              // Legacy sessions without expiry: keep the token but mark it expired
              // so the next request forces a re-login (no surprise lockout, just a
              // standard 401 → login flow).
              const tokenIssuedAt = user.token_issued_at || (hasToken ? user.created_at || seedDb.createdAt : null);
              const tokenExpiresAt = user.token_expires_at || (hasToken ? new Date(0).toISOString() : null);

              return {
                ...user,
                token: user.token || null,
                token_issued_at: tokenIssuedAt,
                token_expires_at: tokenExpiresAt,
                created_at: user.created_at || seedDb.createdAt,
                role: resolveUserRole(user.email, user.role || defaultUser.role),
                plan: user.plan || defaultUser.plan,
                auth_provider: user.auth_provider || "password",
                oauth_accounts:
                  user.oauth_accounts && typeof user.oauth_accounts === "object"
                    ? user.oauth_accounts
                    : {},
              };
            })
        : seedDb.users,
    attempts: Array.isArray(db.attempts) ? db.attempts : [],
    mockExams: Array.isArray(db.mockExams) ? db.mockExams : [],
    payments: Array.isArray(db.payments) ? db.payments : [],
    stripeEvents:
      db.stripeEvents && typeof db.stripeEvents === "object"
        ? db.stripeEvents
        : {},
    practiceSessions:
      db.practiceSessions && typeof db.practiceSessions === "object"
        ? db.practiceSessions
        : {},
    oauthStates:
      db.oauthStates && typeof db.oauthStates === "object"
        ? db.oauthStates
        : {},
    tutorConversations:
      db.tutorConversations && typeof db.tutorConversations === "object"
        ? db.tutorConversations
        : {},
    customQuestions: Array.isArray(db.customQuestions) ? db.customQuestions : [],
    rateLimits:
      db.rateLimits && typeof db.rateLimits === "object" ? db.rateLimits : {},
  };
}
