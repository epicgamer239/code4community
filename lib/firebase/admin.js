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

  // ADC only when a project id is present (Cloud Run / GCE). Otherwise
  // initializeApp succeeds but the first query fails with "Unable to detect a Project Id"
  // — which breaks `next build` prerender in CI.
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT;
  if (!projectId) {
    throw new Error("Firebase Admin is not configured.");
  }
  return initializeApp({ credential: applicationDefault(), projectId });
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
