import { defaultUser, DEMO_USER_ID } from "../../shared/backend-core.js";
import { hashPassword } from "./auth.js";

const LEGACY_DEMO_EMAIL = "alex.carter@example.com";
const LEGACY_DEMO_EMAILS = [LEGACY_DEMO_EMAIL, "demo@rbtgenius.app"];
export const ADMIN_EMAILS = [];
export const HARDCODED_TEST_ACCOUNT = {
  id: "bootstrap_test_user",
  email: "test@rbtgenius.com",
  password: "Review123!",
  full_name: "Test RBT Genius",
};
const HARDCODED_TEST_PASSWORD = hashPassword(
  HARDCODED_TEST_ACCOUNT.password,
  "rbtgenius_test_account_salt",
);

function buildHardcodedTestUser(createdAt = new Date().toISOString(), existingUser = null) {
  return {
    ...(existingUser || {}),
    id: existingUser?.id || HARDCODED_TEST_ACCOUNT.id,
    full_name: HARDCODED_TEST_ACCOUNT.full_name,
    email: HARDCODED_TEST_ACCOUNT.email,
    created_at: existingUser?.created_at || createdAt,
    role: resolveUserRole(HARDCODED_TEST_ACCOUNT.email, existingUser?.role || defaultUser.role),
    plan: existingUser?.plan || defaultUser.plan,
    token: existingUser?.token || null,
    token_issued_at: existingUser?.token_issued_at || null,
    token_expires_at: existingUser?.token_expires_at || null,
    auth_provider: "password",
    oauth_accounts:
      existingUser?.oauth_accounts && typeof existingUser.oauth_accounts === "object"
        ? existingUser.oauth_accounts
        : {},
    password_hash: HARDCODED_TEST_PASSWORD.hash,
    password_salt: HARDCODED_TEST_PASSWORD.salt,
    email_verified: true,
    email_verification_token: null,
  };
}

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
    pushTokens: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeDb(db) {
  if (!db || typeof db !== "object") {
    return buildSeedDb();
  }

  const seedDb = buildSeedDb();
  const normalizedUsers = Array.isArray(db.users) && db.users.length > 0
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
    : [];

  const existingHardcodedTestUser = normalizedUsers.find(
    (user) => String(user.email || "").toLowerCase() === HARDCODED_TEST_ACCOUNT.email,
  );
  const usersWithHardcodedTest = [
    ...normalizedUsers.filter(
      (user) => String(user.email || "").toLowerCase() !== HARDCODED_TEST_ACCOUNT.email,
    ),
    buildHardcodedTestUser(seedDb.createdAt, existingHardcodedTestUser),
  ];

  return {
    ...seedDb,
    ...db,
    users: usersWithHardcodedTest,
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
    pushTokens:
      db.pushTokens && typeof db.pushTokens === "object" ? db.pushTokens : {},
  };
}
