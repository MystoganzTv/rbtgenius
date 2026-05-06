import crypto from "node:crypto";

// Sliding session lifetime. Pattern matches Auth0 / Quizlet / Mometrix defaults.
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;        // 30 days
export const SESSION_REFRESH_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 7; // rotate when <7 days left

export function createSessionToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function buildSession(token = createSessionToken(), now = Date.now()) {
  return {
    token,
    issued_at: new Date(now).toISOString(),
    expires_at: new Date(now + SESSION_TTL_MS).toISOString(),
  };
}

export function isSessionExpired(user, now = Date.now()) {
  if (!user?.token) return true;
  if (!user.token_expires_at) return true; // legacy sessions w/o expiry are treated as expired
  const expiresAtMs = new Date(user.token_expires_at).getTime();
  if (!Number.isFinite(expiresAtMs)) return true;
  return expiresAtMs <= now;
}

export function shouldRotateSession(user, now = Date.now()) {
  if (!user?.token_expires_at) return true;
  const expiresAtMs = new Date(user.token_expires_at).getTime();
  if (!Number.isFinite(expiresAtMs)) return true;
  return expiresAtMs - now <= SESSION_REFRESH_THRESHOLD_MS;
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

export function verifyPassword(password, salt, hash) {
  const nextHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(nextHash, "hex"), Buffer.from(hash, "hex"));
}
