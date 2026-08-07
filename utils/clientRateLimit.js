/**
 * In-browser / same-tab rate limits before Firestore writes.
 * Stops double-clicks and casual abuse; determined bots need App Check + rules.
 */

const globalStore = globalThis.__clientRateLimitStore || new Map();
globalThis.__clientRateLimitStore = globalStore;

/** @type {Record<string, { maxRequests: number; windowMs: number }>} */
export const CLIENT_RATE_LIMITS = {
  sessionCreate: { maxRequests: 8, windowMs: 10 * 60_000 },
  sessionUpdate: { maxRequests: 40, windowMs: 60_000 },
  sessionReportUpload: { maxRequests: 15, windowMs: 60 * 60_000 },
  receiptShareCreate: { maxRequests: 20, windowMs: 60 * 60_000 },
  miniLessonCreate: { maxRequests: 30, windowMs: 60_000 },
  tutoringRequestCreate: { maxRequests: 10, windowMs: 10 * 60_000 },
  tutoringRequestUpdate: { maxRequests: 60, windowMs: 60_000 },
  schedulerBook: { maxRequests: 20, windowMs: 60_000 },
  profileWrite: { maxRequests: 15, windowMs: 60_000 },
  libraryPassClaim: { maxRequests: 12, windowMs: 10 * 60_000 },
  libraryPassAdmin: { maxRequests: 40, windowMs: 60_000 },
  seatingChartSave: { maxRequests: 20, windowMs: 60_000 },
};

function nowMs() {
  return Date.now();
}

function bucketKey(scope, uid) {
  return `${scope}:${uid || "anon"}`;
}

function getBucket(key) {
  if (!globalStore.has(key)) globalStore.set(key, []);
  return globalStore.get(key);
}

/**
 * @param {keyof typeof CLIENT_RATE_LIMITS} scope
 * @param {string | undefined | null} uid
 * @returns {{ allowed: boolean; resetAt: number }}
 */
export function checkClientRateLimit(scope, uid) {
  const config = CLIENT_RATE_LIMITS[scope];
  if (!config) return { allowed: true, resetAt: nowMs() };

  const key = bucketKey(scope, uid);
  const now = nowMs();
  const bucket = getBucket(key);
  const valid = bucket.filter((t) => t > now - config.windowMs);

  if (valid.length >= config.maxRequests) {
    const oldest = valid[0] ?? now;
    return { allowed: false, resetAt: oldest + config.windowMs };
  }

  valid.push(now);
  globalStore.set(key, valid);
  return { allowed: true, resetAt: now + config.windowMs };
}

/**
 * @param {keyof typeof CLIENT_RATE_LIMITS} scope
 * @param {string | undefined | null} uid
 */
export function assertClientRateLimit(scope, uid) {
  const result = checkClientRateLimit(scope, uid);
  if (!result.allowed) {
    const mins = Math.max(1, Math.ceil((result.resetAt - nowMs()) / 60_000));
    throw new Error(
      `Too many requests. Please wait about ${mins} minute${mins === 1 ? "" : "s"} and try again.`
    );
  }
}
