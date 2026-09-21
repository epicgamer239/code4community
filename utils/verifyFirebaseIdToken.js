import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";

/**
 * Resolved once: repo-root `keys.dev.js` (same file `firebase.js` uses in dev).
 * Do not use `process.cwd()` — Next.js server chunks can run with a different cwd.
 */
const KEYS_DEV_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "keys.dev.js");

/**
 * Web API key used by Identity Toolkit `accounts:lookup` — must match the Firebase app the user signed into.
 * Prefer env (works in prod and when .env.local is loaded). In development, `firebase.js` often uses
 * `keys.dev.js` only — if NEXT_PUBLIC_* is missing on the server, we read the same file so token verify works.
 */
function getFirebaseWebApiKeyFromEnv() {
  const k = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (typeof k === "string" && k.trim()) return k.trim();
  const k2 = process.env.FIREBASE_API_KEY;
  if (typeof k2 === "string" && k2.trim()) return k2.trim();
  return undefined;
}

/**
 * Fallback when dynamic import() fails (some Next server bundles). `keys.dev.js` is ESM; we only need apiKey.
 */
function readApiKeyFromKeysDevSource() {
  if (!existsSync(KEYS_DEV_PATH)) return undefined;
  try {
    const src = readFileSync(KEYS_DEV_PATH, "utf8");
    const m = src.match(/apiKey:\s*["']([^"']+)["']/);
    const key = m?.[1]?.trim();
    return key || undefined;
  } catch {
    return undefined;
  }
}

function shouldUseDevFirebaseKeys() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_USE_DEV_FIREBASE === "1"
  );
}

async function getFirebaseWebApiKeyFromKeysDev() {
  if (!existsSync(KEYS_DEV_PATH)) return undefined;

  try {
    const mod = await import(pathToFileURL(KEYS_DEV_PATH).href);
    const key = mod.firebaseConfig?.apiKey;
    if (typeof key === "string" && key.trim()) return key.trim();
  } catch {
    // Next/webpack sometimes fails on dynamic file:// imports of repo-root modules
  }

  return readApiKeyFromKeysDevSource();
}

async function getFirebaseWebApiKey() {
  if (shouldUseDevFirebaseKeys()) {
    const fromKeys = await getFirebaseWebApiKeyFromKeysDev();
    if (fromKeys) return fromKeys;
  }

  const fromEnv = getFirebaseWebApiKeyFromEnv();
  if (fromEnv) return fromEnv;

  if (!shouldUseDevFirebaseKeys()) return undefined;

  return getFirebaseWebApiKeyFromKeysDev();
}

/**
 * Verify a Firebase ID token using the Identity Toolkit REST API (no Admin SDK).
 * @param {string} idToken
 * @returns {Promise<{ ok: true, uid: string, email?: string } | { ok: false, error: string }>}
 */
export async function verifyFirebaseIdToken(idToken) {
  if (!idToken || typeof idToken !== "string") {
    return { ok: false, error: "Missing ID token" };
  }

  const apiKey = await getFirebaseWebApiKey();
  if (!apiKey) {
    return {
      ok: false,
      error:
        "Server misconfigured: set NEXT_PUBLIC_FIREBASE_API_KEY in .env.local (same Firebase project as the client), or put your Web API key in keys.dev.js for local dev. Restart `next dev` after changing env.",
    };
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error || !Array.isArray(data.users) || data.users.length === 0) {
    return { ok: false, error: "Invalid or expired session. Please sign in again." };
  }

  const u = data.users[0];
  return {
    ok: true,
    uid: u.localId,
    email: u.email,
  };
}
