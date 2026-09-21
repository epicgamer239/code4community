"use client";

import { useSyncExternalStore } from "react";

/**
 * @param {number} [maxWidth=767] — true when viewport width is at most this value (px).
 */
export function useIsMobile(maxWidth = 767) {
  const query = `(max-width: ${maxWidth}px)`;

  return useSyncExternalStore(
    (callback) => {
      if (typeof window === "undefined") return () => {};
      const mq = window.matchMedia(query);
      mq.addEventListener("change", callback);
      return () => mq.removeEventListener("change", callback);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
