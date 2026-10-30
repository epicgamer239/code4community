"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect signed-in users who fail `allowed` to `redirectTo`.
 * @param {{
 *   loading: boolean,
 *   user: { uid?: string } | null | undefined,
 *   userData: object | null | undefined,
 *   allowed: boolean,
 *   redirectTo?: string,
 * }} args
 */
export function useRequireAccess({
  loading,
  user,
  userData,
  allowed,
  redirectTo = "/",
}) {
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && userData && !allowed) {
      router.replace(redirectTo);
    }
  }, [loading, user, userData, allowed, redirectTo, router]);
}
