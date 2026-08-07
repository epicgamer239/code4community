/**
 * Public Firebase Web config (safe to expose in the browser).
 * Defaults match project code4community26 — used when build-time NEXT_PUBLIC_* are missing.
 */
export const CODE4COMMUNITY26_FIREBASE = {
  apiKey: "AIzaSyAnMqlekmlRnvyQeujfKoUPIYu8JtBDTDA",
  authDomain: "code4community26.firebaseapp.com",
  projectId: "code4community26",
  storageBucket: "code4community26.firebasestorage.app",
  messagingSenderId: "698474286096",
  appId: "1:698474286096:web:0b23171803dac353ec4e95",
};

export const CODE4COMMUNITY26_RECAPTCHA_SITE_KEY =
  "6LfPCPMsAAAAAJoZ0jAGk2KGfA42KptDBhTRgz2J";

function pickEnv(name, fallback) {
  const v = process.env[name];
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  return fallback;
}

/** Server + client: resolved config with env overrides then production defaults. */
export function getPublicFirebaseConfig() {
  return {
    apiKey: pickEnv("NEXT_PUBLIC_FIREBASE_API_KEY", CODE4COMMUNITY26_FIREBASE.apiKey),
    authDomain: pickEnv(
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
      CODE4COMMUNITY26_FIREBASE.authDomain,
    ),
    projectId: pickEnv(
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      CODE4COMMUNITY26_FIREBASE.projectId,
    ),
    storageBucket: pickEnv(
      "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
      CODE4COMMUNITY26_FIREBASE.storageBucket,
    ),
    messagingSenderId: pickEnv(
      "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
      CODE4COMMUNITY26_FIREBASE.messagingSenderId,
    ),
    appId: pickEnv("NEXT_PUBLIC_FIREBASE_APP_ID", CODE4COMMUNITY26_FIREBASE.appId),
  };
}

export function getRecaptchaSiteKey() {
  return pickEnv("NEXT_PUBLIC_RECAPTCHA_SITE_KEY", CODE4COMMUNITY26_RECAPTCHA_SITE_KEY);
}

export function maskSecret(value) {
  if (!value || typeof value !== "string") return "(missing)";
  if (value.length <= 10) return "(set)";
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

/** Safe debug payload for /api/debug/firebase-config */
export function getFirebaseConfigDebug() {
  const fromEnv = getPublicFirebaseConfig();
  const defaults = CODE4COMMUNITY26_FIREBASE;
  const apiKeyFromEnv = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() || "";

  return {
    projectId: fromEnv.projectId,
    authDomain: fromEnv.authDomain,
    apiKey: maskSecret(fromEnv.apiKey),
    apiKeySource: apiKeyFromEnv
      ? "NEXT_PUBLIC_FIREBASE_API_KEY"
      : "code4community26-default",
    apiKeyLooksValid: /^AIza[0-9A-Za-z_-]{30,}$/.test(fromEnv.apiKey),
    appId: maskSecret(fromEnv.appId),
    recaptchaConfigured: Boolean(getRecaptchaSiteKey()),
    recaptchaSiteKey: maskSecret(getRecaptchaSiteKey()),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "(unset)",
    nodeEnv: process.env.NODE_ENV,
    hints: [
      "If auth/invalid-api-key persists, check Google Cloud Console → Credentials → API key HTTP referrer restrictions include code4community26.web.app",
      "Firebase Console → Authentication → Authorized domains must include code4community26.web.app",
    ],
  };
}
