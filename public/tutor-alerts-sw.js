/* eslint-disable no-undef */
/**
 * Lightweight SW so Chrome can show OS notification banners for tutoring alerts
 * while a site tab is open (including when Chrome is in the background).
 */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification?.data?.href || "/mathlab";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        try {
          const url = new URL(client.url);
          if (url.origin === self.location.origin && "focus" in client) {
            if ("navigate" in client) {
              return client.navigate(href).then((c) => (c && c.focus ? c.focus() : client.focus()));
            }
            return client.focus();
          }
        } catch {
          /* keep looking */
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(href);
      return undefined;
    }),
  );
});
