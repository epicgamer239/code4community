import { getMessaging } from "firebase-admin/messaging";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  ACCEPTING_FIELD_BY_SERVICE,
  WEB_PUSH_TOKENS_FIELD,
} from "@/lib/tutorAlerts/services";

/**
 * Fan out FCM web push to tutors who are accepting for this service.
 * No-op when Admin / Messaging is unavailable or no tokens exist.
 *
 * @param {{
 *   service: import("@/lib/tutorAlerts/services").TutorAlertService,
 *   title: string,
 *   body: string,
 *   href: string,
 *   tag?: string,
 * }} opts
 */
export async function notifyAcceptingTutors({ service, title, body, href, tag }) {
  const db = getAdminFirestore();
  if (!db) return { sent: 0, reason: "no-admin" };

  const field = ACCEPTING_FIELD_BY_SERVICE[service];
  if (!field) return { sent: 0, reason: "bad-service" };

  const snap = await db.collection("users").where(field, "==", true).get();
  /** @type {string[]} */
  const tokens = [];
  for (const docSnap of snap.docs) {
    const map = docSnap.data()?.[WEB_PUSH_TOKENS_FIELD];
    if (!map || typeof map !== "object") continue;
    for (const [token, meta] of Object.entries(map)) {
      if (!token || typeof token !== "string") continue;
      if (meta && typeof meta === "object" && meta.service && meta.service !== service) {
        continue;
      }
      tokens.push(token);
    }
  }

  if (tokens.length === 0) return { sent: 0, reason: "no-tokens" };

  let messaging;
  try {
    messaging = getMessaging();
  } catch {
    return { sent: 0, reason: "no-messaging" };
  }

  const unique = [...new Set(tokens)].slice(0, 500);
  const res = await messaging.sendEachForMulticast({
    tokens: unique,
    notification: { title, body },
    data: {
      href: String(href || "/"),
      tag: String(tag || `tutor-${service}`),
      service: String(service),
    },
    webpush: {
      fcmOptions: { link: href || "/" },
    },
  });

  return { sent: res.successCount, failureCount: res.failureCount };
}
