/* eslint-disable no-undef */
/* Firebase Cloud Messaging service worker for tutor request alerts. */
importScripts("https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js");

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification?.data?.href || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate?.(href);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(href);
      return undefined;
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "FIREBASE_CONFIG" && event.data.config) {
    try {
      firebase.initializeApp(event.data.config);
      const messaging = firebase.messaging();
      messaging.onBackgroundMessage((payload) => {
        const title = payload?.notification?.title || "New tutoring request";
        const body = payload?.notification?.body || "A student needs help.";
        const href = payload?.data?.href || "/";
        self.registration.showNotification(title, {
          body,
          data: { href },
          tag: payload?.data?.tag || "tutor-fcm",
        });
      });
    } catch {
      /* already initialized */
    }
  }
});
