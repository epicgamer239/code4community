"use client";

/**
 * Schedule work from useEffect without synchronous setState (react-hooks/set-state-in-effect).
 * @param {() => void | (() => void)} work
 * @returns {() => void} cleanup
 */
export function runEffectWork(work) {
  let cancelled = false;
  let innerCleanup;

  queueMicrotask(() => {
    if (cancelled) return;
    innerCleanup = work();
  });

  return () => {
    cancelled = true;
    if (typeof innerCleanup === "function") innerCleanup();
  };
}
