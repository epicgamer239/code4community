const SW_URL = "/tutor-alerts-sw.js";
const ICON_URL = "/brand/c4c.png";

/**
 * @returns {Promise<NotificationPermission | "unsupported">}
 */
export async function ensureTutorNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "granted") {
    await ensureTutorAlertServiceWorker();
    return "granted";
  }
  if (Notification.permission === "denied") return "denied";
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") await ensureTutorAlertServiceWorker();
    return permission;
  } catch {
    return Notification.permission;
  }
}

/** Register / activate the SW used for OS notification banners. */
export async function ensureTutorAlertServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
    // Wait until this registration has an active worker.
    if (reg.active) {
      await navigator.serviceWorker.ready;
      return reg;
    }
    const worker = reg.installing || reg.waiting;
    if (worker) {
      await new Promise((resolve) => {
        if (worker.state === "activated") {
          resolve();
          return;
        }
        worker.addEventListener("statechange", () => {
          if (worker.state === "activated" || worker.state === "redundant") resolve();
        });
      });
    }
    await navigator.serviceWorker.ready;
    return (await navigator.serviceWorker.getRegistration(SW_URL)) || reg;
  } catch {
    try {
      return (await navigator.serviceWorker.getRegistration("/")) || null;
    } catch {
      return null;
    }
  }
}

/**
 * Persistent Chrome/macOS notification via service worker.
 * @param {{
 *   title: string,
 *   body: string,
 *   tag?: string,
 *   href?: string,
 * }} opts
 * @returns {Promise<boolean>}
 */
export async function showTutorBrowserNotification({ title, body, tag, href }) {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;

  const options = {
    body,
    tag: tag || `tutor-request-${Date.now()}`,
    renotify: true,
    requireInteraction: false,
    silent: false,
    icon: ICON_URL,
    badge: ICON_URL,
    data: { href: href || "/" },
  };

  // Prefer SW notifications (persistent / Notification Center). Do not also call
  // `new Notification` with the same tag — Chrome replaces the first and it can
  // look like nothing appeared.
  try {
    const reg = await ensureTutorAlertServiceWorker();
    if (reg && typeof reg.showNotification === "function") {
      await reg.showNotification(title, options);
      return true;
    }
  } catch {
    /* fall through */
  }

  try {
    const n = new Notification(title, options);
    n.onclick = () => {
      try {
        window.focus();
        if (href) {
          const url = new URL(href, window.location.origin);
          if (url.origin === window.location.origin) {
            window.location.href = `${url.pathname}${url.search}${url.hash}`;
          }
        }
      } catch {
        /* ignore */
      }
      n.close();
    };
    return true;
  } catch {
    return false;
  }
}
