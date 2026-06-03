const globalStore = globalThis.__rateLimitStore || new Map();
globalThis.__rateLimitStore = globalStore;

/** @type {Record<string, { maxRequests: number; windowMs: number }>} */
export const RATE_LIMIT_PRESETS = {
  /** Baseline for all /api routes (middleware + fallback). */
  apiDefault: { maxRequests: 150, windowMs: 60_000 },
  avatar: { maxRequests: 30, windowMs: 60_000 },
  upload: { maxRequests: 20, windowMs: 60_000 },
  /** Expensive Gemini calls — per IP before auth. */
  aiQuizIp: { maxRequests: 15, windowMs: 60_000 },
  /** Expensive Gemini calls — per signed-in user. */
  aiQuizUser: { maxRequests: 40, windowMs: 60 * 60_000 },
  /** Google Form → Firestore sync webhook. */
  syncWebhook: { maxRequests: 60, windowMs: 60_000 },
  debug: { maxRequests: 5, windowMs: 60_000 },
};

function nowMs() {
  return Date.now();
}

export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const firstForwarded = forwarded?.split(",")[0]?.trim();
  return firstForwarded || request.headers.get("x-real-ip") || "unknown";
}

function getRateLimitBucket(key) {
  if (!globalStore.has(key)) {
    globalStore.set(key, []);
  }
  return globalStore.get(key);
}

export function checkSlidingWindowRateLimit({
  key,
  maxRequests,
  windowMs,
  now = nowMs(),
}) {
  const bucket = getRateLimitBucket(key);
  const validRequests = bucket.filter((timestamp) => timestamp > now - windowMs);

  if (validRequests.length >= maxRequests) {
    const oldest = validRequests[0] ?? now;
    return {
      allowed: false,
      remaining: 0,
      resetAt: oldest + windowMs,
    };
  }

  validRequests.push(now);
  globalStore.set(key, validRequests);

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - validRequests.length),
    resetAt: now + windowMs,
  };
}

/**
 * @param {Request} request
 * @param {keyof typeof RATE_LIMIT_PRESETS} preset
 * @param {string} [extraKeyPart]
 */
export function checkApiRateLimit(request, preset, extraKeyPart = "") {
  const config = RATE_LIMIT_PRESETS[preset] || RATE_LIMIT_PRESETS.apiDefault;
  const ip = getClientIp(request);
  const key = extraKeyPart
    ? `api:${preset}:${ip}:${extraKeyPart}`
    : `api:${preset}:${ip}`;
  return checkSlidingWindowRateLimit({ key, ...config });
}

export function retryAfterSeconds(resetAt, now = nowMs()) {
  return Math.max(1, Math.ceil((resetAt - now) / 1000));
}

export function rateLimitResponse(result) {
  const retryAfter = String(retryAfterSeconds(result.resetAt));
  return new Response(
    JSON.stringify({ error: "Too many requests. Try again shortly." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": retryAfter,
      },
    }
  );
}

/** @param {import('next/server').NextResponse} NextResponse */
export function rateLimitNextResponse(result, NextResponse) {
  const retryAfter = String(retryAfterSeconds(result.resetAt));
  return NextResponse.json(
    { error: "Too many requests. Try again shortly." },
    {
      status: 429,
      headers: { "Retry-After": retryAfter },
    }
  );
}

/**
 * Wrap an App Router API handler with a sliding-window limit.
 * @param {Function} handler
 * @param {{ preset?: keyof typeof RATE_LIMIT_PRESETS, getKeyPart?: (request: Request) => string }} [options]
 */
export function withRateLimit(handler, options = {}) {
  const preset = options.preset || "apiDefault";
  return async (request, context) => {
    const extra = options.getKeyPart?.(request) || "";
    const result = checkApiRateLimit(request, preset, extra);
    if (!result.allowed) {
      return rateLimitResponse(result);
    }
    return handler(request, context);
  };
}
