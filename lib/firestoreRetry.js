/**
 * Retry transient Firestore client failures (offline / unavailable), common on
 * school Wi‑Fi when WebChannel is flaky before long-polling kicks in.
 *
 * @template T
 * @param {() => Promise<T>} fn
 * @param {{ retries?: number, delayMs?: number }} [opts]
 * @returns {Promise<T>}
 */
export async function withFirestoreRetry(fn, opts = {}) {
  const retries = typeof opts.retries === "number" ? opts.retries : 2;
  const delayMs = typeof opts.delayMs === "number" ? opts.delayMs : 400;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryableFirestoreError(err) || attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
  throw lastErr;
}

/** @param {unknown} err */
export function isRetryableFirestoreError(err) {
  if (!err || typeof err !== "object") return false;
  const code = "code" in err ? String(err.code || "") : "";
  const message = "message" in err ? String(err.message || "") : "";
  if (code === "unavailable" || code === "deadline-exceeded") return true;
  return /client is offline|Failed to get document because the client is offline/i.test(
    message,
  );
}

/** User-facing copy for the common school-network offline failure. */
export function firestoreUserMessage(err, fallback = "Something went wrong.") {
  if (isRetryableFirestoreError(err)) {
    return "Could not reach Club Hub data (network). Try refreshing, or use another network if your school Wi‑Fi blocks Firebase.";
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
