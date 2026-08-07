import { onSnapshot } from "firebase/firestore";

function documentIsHidden() {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

/**
 * One Firestore onSnapshot shared by many React subscribers.
 * Pauses while the tab is hidden; keeps last data so the UI does not blank.
 *
 * @param {{
 *   getQuery: () => import('firebase/firestore').Query | null | undefined,
 *   mapSnapshot: (snap: import('firebase/firestore').QuerySnapshot) => unknown,
 *   onError?: (err: unknown) => void,
 * }} options
 */
export function createSharedQueryListener({ getQuery, mapSnapshot, onError }) {
  /** @type {Set<(data: unknown) => void>} */
  const subscribers = new Set();
  /** @type {(() => void) | null} */
  let unsubscribeFs = null;
  /** @type {unknown} */
  let lastData = null;
  let visibilityBound = false;

  function emit(data) {
    lastData = data;
    for (const cb of subscribers) {
      try {
        cb(data);
      } catch {
        // Subscriber errors should not tear down the shared listener.
      }
    }
  }

  function start() {
    if (unsubscribeFs || documentIsHidden()) return;
    let q;
    try {
      q = getQuery();
    } catch (err) {
      onError?.(err);
      return;
    }
    if (!q) return;

    unsubscribeFs = onSnapshot(
      q,
      (snap) => {
        emit(mapSnapshot(snap));
      },
      (err) => {
        onError?.(err);
      },
    );
  }

  function stop() {
    if (unsubscribeFs) {
      unsubscribeFs();
      unsubscribeFs = null;
    }
  }

  function onVisibilityChange() {
    if (documentIsHidden()) {
      stop();
      return;
    }
    if (subscribers.size > 0) start();
  }

  function bindVisibility() {
    if (visibilityBound || typeof document === "undefined") return;
    document.addEventListener("visibilitychange", onVisibilityChange);
    visibilityBound = true;
  }

  function unbindVisibility() {
    if (!visibilityBound || typeof document === "undefined") return;
    document.removeEventListener("visibilitychange", onVisibilityChange);
    visibilityBound = false;
  }

  /**
   * @param {(data: any) => void} callback
   * @returns {() => void}
   */
  function subscribe(callback) {
    subscribers.add(callback);
    if (lastData != null) callback(lastData);
    bindVisibility();
    if (!documentIsHidden()) start();

    return () => {
      subscribers.delete(callback);
      if (subscribers.size === 0) {
        stop();
        unbindVisibility();
      }
    };
  }

  return {
    subscribe,
    getLastData: () => lastData,
  };
}

/**
 * Single-subscriber listener that pauses while the tab is hidden.
 * Use for per-user queries that cannot be shared.
 *
 * @param {() => import('firebase/firestore').Query | null | undefined} getQuery
 * @param {(snap: import('firebase/firestore').QuerySnapshot) => void} onSnap
 * @param {(err: unknown) => void} [onError]
 * @returns {() => void}
 */
export function subscribeWhileVisible(getQuery, onSnap, onError) {
  /** @type {(() => void) | null} */
  let unsubscribeFs = null;

  function start() {
    if (unsubscribeFs || documentIsHidden()) return;
    let q;
    try {
      q = getQuery();
    } catch (err) {
      onError?.(err);
      return;
    }
    if (!q) return;
    unsubscribeFs = onSnapshot(q, onSnap, (err) => onError?.(err));
  }

  function stop() {
    if (unsubscribeFs) {
      unsubscribeFs();
      unsubscribeFs = null;
    }
  }

  function onVisibilityChange() {
    if (documentIsHidden()) stop();
    else start();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }
  start();

  return () => {
    stop();
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
  };
}
