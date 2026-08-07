import { cert, getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function initAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    return initializeApp({ credential: cert(JSON.parse(json)) });
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
