/** Client-only Math Lab admin Super mode (sessionStorage). */

const STORAGE_KEY = "mathlabSuperMode";
const EVENT = "mathlabSuperModeChanged";

export function isMathLabSuperModeEnabled() {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMathLabSuperModeEnabled(enabled) {
  if (typeof window === "undefined") return;
  try {
    if (enabled) sessionStorage.setItem(STORAGE_KEY, "1");
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { enabled: Boolean(enabled) } }));
}

export function subscribeMathLabSuperMode(callback) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e) => {
    if (e.key === STORAGE_KEY || e.key === null) callback(isMathLabSuperModeEnabled());
  };
  const onCustom = (e) => callback(Boolean(e.detail?.enabled));
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, onCustom);
  };
}
