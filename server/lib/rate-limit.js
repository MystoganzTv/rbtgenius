/**
 * Lightweight rate limiter that piggybacks on the app's existing JSON store.
 * Same code runs against the Express dev server (server/index.js) and the
 * Netlify Function (netlify/functions/api.mjs).
 *
 * Storage shape under db.rateLimits:
 *   {
 *     "<bucketKey>": { count: number, expires_at: ISOString, first_attempt_at: ISOString }
 *   }
 *
 * The bucketKey encodes the rule + identity, e.g. "login:1.2.3.4:foo@bar.com".
 */

const DEFAULT_BUCKETS = {
  login: {
    limit: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  register: {
    limit: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
};

export function getRateLimitConfig(bucket) {
  return DEFAULT_BUCKETS[bucket] || null;
}

function pruneRateLimits(rateLimits = {}, now = Date.now()) {
  const next = {};
  Object.entries(rateLimits).forEach(([key, value]) => {
    const expiresAtMs = new Date(value?.expires_at || 0).getTime();
    if (Number.isFinite(expiresAtMs) && expiresAtMs > now) {
      next[key] = value;
    }
  });
  return next;
}

function bucketKey(bucket, identityParts) {
  return `${bucket}:${identityParts.filter(Boolean).join(":").toLowerCase()}`;
}

/**
 * Reads the current state for a given bucket+identity. Pure: returns counts only,
 * does not mutate. Use this to decide if a request should be rejected before
 * actually doing the work.
 */
export function checkRateLimit(db, bucket, identityParts, now = Date.now()) {
  const config = getRateLimitConfig(bucket);
  if (!config) {
    return { allowed: true, remaining: Infinity, retryAfterSeconds: 0 };
  }

  const key = bucketKey(bucket, identityParts);
  const entry = db?.rateLimits?.[key];
  const expiresAtMs = entry ? new Date(entry.expires_at).getTime() : 0;
  const isActive = entry && Number.isFinite(expiresAtMs) && expiresAtMs > now;
  const count = isActive ? entry.count : 0;

  if (count >= config.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((expiresAtMs - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
      limit: config.limit,
      windowMs: config.windowMs,
    };
  }

  return {
    allowed: true,
    remaining: config.limit - count,
    retryAfterSeconds: 0,
    limit: config.limit,
    windowMs: config.windowMs,
  };
}

/**
 * Returns the next state of `db.rateLimits` after recording one attempt for
 * the given bucket+identity. The window starts on the first attempt and does
 * NOT slide — this avoids the case where an attacker keeps spamming forever
 * by getting one new attempt in just before the window resets.
 */
export function recordRateLimitAttempt(db, bucket, identityParts, now = Date.now()) {
  const config = getRateLimitConfig(bucket);
  if (!config) return db || {};

  const rateLimits = pruneRateLimits(db?.rateLimits || {}, now);
  const key = bucketKey(bucket, identityParts);
  const existing = rateLimits[key];
  const expiresAtMs = existing ? new Date(existing.expires_at).getTime() : 0;
  const isActive = existing && Number.isFinite(expiresAtMs) && expiresAtMs > now;

  rateLimits[key] = isActive
    ? { ...existing, count: existing.count + 1 }
    : {
        count: 1,
        first_attempt_at: new Date(now).toISOString(),
        expires_at: new Date(now + config.windowMs).toISOString(),
      };

  return {
    ...(db || {}),
    rateLimits,
  };
}

/**
 * Convenience for resetting a bucket on success — e.g. clear the login counter
 * for a given (IP, email) once they authenticate correctly.
 */
export function clearRateLimit(db, bucket, identityParts) {
  const key = bucketKey(bucket, identityParts);
  if (!db?.rateLimits?.[key]) return db || {};

  const nextRateLimits = { ...db.rateLimits };
  delete nextRateLimits[key];
  return { ...db, rateLimits: nextRateLimits };
}
