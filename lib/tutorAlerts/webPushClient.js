import { getApps } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { upsertTutorWebPushToken } from "@/lib/tutorAlerts/acceptingTutoringClient";
import { playTutorAlertSound } from "@/lib/tutorAlerts/sound";
import { showTutorBrowserNotification } from "@/lib/tutorAlerts/browserNotify";

function vapidKey() {
  const key = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  return typeof key === "string" && key.trim() ? key.trim() : "";
}

/**
 * Register FCM web push when a VAPID key is configured.
 * @param {string} userId
 * @param {import("@/lib/tutorAlerts/services").TutorAlertService} service
 * @returns {Promise<boolean>} true if token saved
 */
export async function enableTutorWebPush(userId, service) {
  if (typeof window === "undefined" || !userId) return false;
  const key = vapidKey();
  if (!key) return false;
  if (!(await isSupported())) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const registration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js",
  );
  await navigator.serviceWorker.ready;

  const app = getApps()[0];
  if (!app) return false;

  const cfg = app.options;
  registration.active?.postMessage({
    type: "FIREBASE_CONFIG",
    config: {
      apiKey: cfg.apiKey,
      authDomain: cfg.authDomain,
      projectId: cfg.projectId,
      storageBucket: cfg.storageBucket,
      messagingSenderId: cfg.messagingSenderId,
      appId: cfg.appId,
    },
  });

  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: key,
    serviceWorkerRegistration: registration,
  });
  if (!token) return false;
  await upsertTutorWebPushToken(userId, token, service);

  onMessage(messaging, (payload) => {
    const title = payload?.notification?.title || "New tutoring request";
    const body = payload?.notification?.body || "A student needs help.";
    playTutorAlertSound();
    showTutorBrowserNotification({
      title,
      body,
      tag: payload?.data?.tag || "tutor-fcm",
      href: payload?.data?.href || "/",
    });
  });

  return true;
}

export function tutorWebPushConfigured() {
  return Boolean(vapidKey());
}
