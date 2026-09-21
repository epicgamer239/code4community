"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/** True after hydration — avoids setState-in-effect for auth/menu UI gates. */
export function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
