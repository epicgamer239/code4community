"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/utils/AuthContext";
import ClubHubNav from "@/components/club-hub/ClubHubNav";
import { CLUB_HUB_MAROON, CLUB_HUB_PAGE_BG } from "@/lib/club-hub/theme";

/**
 * Shared shell for Club Hub admin/sponsor pages: auth loading, logged-out CTA, redirect, nav.
 * @param {{
 *   active: "admin" | "sponsor",
 *   loginRedirect: string,
 *   title: string,
 *   loginMessage: string,
 *   allowed: boolean,
 *   accessLoading?: boolean,
 *   children: import("react").ReactNode,
 * }} props
 */
export default function ClubHubProtectedPage({
  active,
  loginRedirect,
  title,
  loginMessage,
  allowed,
  accessLoading = false,
  children,
}) {
  const router = useRouter();
  const { user, userData, loading } = useAuth();

  useEffect(() => {
    if (!loading && !accessLoading && user && userData && !allowed) {
      router.replace("/club-hub");
    }
  }, [loading, accessLoading, user, userData, allowed, router]);

  if (loading || accessLoading) {
    return (
      <div
        className="min-h-screen px-4 py-16 text-center text-neutral-600"
        style={{ backgroundColor: CLUB_HUB_PAGE_BG }}
      >
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: CLUB_HUB_PAGE_BG }}>
        <ClubHubNav active={active} loginRedirect={loginRedirect} />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-xl font-bold text-neutral-900">{title}</h1>
          <p className="mt-2 text-sm text-neutral-600">{loginMessage}</p>
          <Link
            href={`/login?redirectTo=${encodeURIComponent(loginRedirect)}`}
            className="mt-5 inline-block rounded-md px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: CLUB_HUB_MAROON }}
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: CLUB_HUB_PAGE_BG }}>
      <ClubHubNav active={active} loginRedirect={loginRedirect} />
      <div className="px-4 py-8 sm:px-6 lg:px-10">{children}</div>
    </div>
  );
}
