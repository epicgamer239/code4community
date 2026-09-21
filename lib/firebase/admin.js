import { cert, getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function parseServiceAccountEnv(raw) {
  if (!raw || typeof raw !== "string") return null;
  let parsed = JSON.parse(raw.trim());
  if (typeof parsed === "string") parsed = JSON.parse(parsed);
  return parsed;
}

function initAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    const serviceAccount = parseServiceAccountEnv(json);
    if (!serviceAccount) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is invalid.");
    }
    return initializeApp({ credential: cert(serviceAccount) });
  }

  return initializeApp({ credential: applicationDefault() });
}

/** @returns {import("firebase-admin/firestore").Firestore | null} */
export function getAdminFirestore() {
  try {
    initAdminApp();
    return getFirestore();
  } catch (err) {
    return null;
  }
}
