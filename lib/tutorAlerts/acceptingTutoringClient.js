import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { firestore } from "@/firebase";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import {
  ACCEPTING_FIELD_BY_SERVICE,
  WEB_PUSH_TOKENS_FIELD,
} from "@/lib/tutorAlerts/services";

/**
 * @param {string} userId
 * @param {import("@/lib/tutorAlerts/services").TutorAlertService} service
 * @param {boolean} enabled
 */
export async function setAcceptingTutoring(userId, service, enabled) {
  if (!firestore || !userId) throw new Error("Could not update tutoring availability.");
  const field = ACCEPTING_FIELD_BY_SERVICE[service];
  if (!field) throw new Error("Unknown tutoring service.");
  assertClientRateLimit("profileWrite", userId);
  await updateDoc(doc(firestore, "users", userId), {
    [field]: Boolean(enabled),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Store / refresh an FCM web push token on the user profile.
 * @param {string} userId
 * @param {string} token
 * @param {import("@/lib/tutorAlerts/services").TutorAlertService} service
 */
export async function upsertTutorWebPushToken(userId, token, service) {
  if (!firestore || !userId || !token) return;
  assertClientRateLimit("profileWrite", userId);
  const { getDoc } = await import("firebase/firestore");
  const ref = doc(firestore, "users", userId);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? snap.data()?.[WEB_PUSH_TOKENS_FIELD] : null;
  /** @type {Record<string, { service: string, updatedAtMs: number }>} */
  const map =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...existing }
      : {};
  map[token] = { service, updatedAtMs: Date.now() };
  // Cap to 8 tokens (devices)
  const entries = Object.entries(map)
    .sort((a, b) => (b[1]?.updatedAtMs || 0) - (a[1]?.updatedAtMs || 0))
    .slice(0, 8);
  await updateDoc(ref, {
    [WEB_PUSH_TOKENS_FIELD]: Object.fromEntries(entries),
    updatedAt: serverTimestamp(),
  });
}
