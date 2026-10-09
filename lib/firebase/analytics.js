import { getAnalytics, isSupported, logEvent } from "firebase/analytics";

/** @type {import("firebase/analytics").Analytics | null} */
let analyticsInstance = null;
/** @type {Promise<import("firebase/analytics").Analytics | null> | null} */
let initPromise = null;

/**
 * Lazy-init Firebase Analytics (browser only). Requires `measurementId` on the Firebase app config
 * or NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID — enable Google Analytics in Firebase Console first.
 *
 * @param {import("firebase/app").FirebaseApp | null} firebaseApp
 */
export function initFirebaseAnalytics(firebaseApp) {
  if (typeof window === "undefined" || !firebaseApp) return Promise.resolve(null);
  if (analyticsInstance) return Promise.resolve(analyticsInstance);
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (!(await isSupported())) return null;
      analyticsInstance = getAnalytics(firebaseApp);
      return analyticsInstance;
    } catch {
      return null;
    }
  })();

  return initPromise;
}

/** @param {string} pagePath */
export async function logAnalyticsPageView(pagePath) {
  if (!analyticsInstance) return;
  logEvent(analyticsInstance, "page_view", {
    page_path: pagePath,
    page_title: typeof document !== "undefined" ? document.title : "",
  });
}
