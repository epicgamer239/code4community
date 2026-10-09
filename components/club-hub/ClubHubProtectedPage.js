"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/utils/AuthContext";
import ClubHubNav from "@/components/club-hub/ClubHubNav";
import ClubHubSkipLink from "@/components/club-hub/ClubHubSkipLink";
import { CLUB_HUB_MAIN_ID, clubHubButtonFocusClass } from "@/lib/club-hub/a11y";
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
        className="min-h-screen px-4 py-16 text-center text-neutral-700"
        style={{ backgroundColor: CLUB_HUB_PAGE_BG }}
        role="status"
        aria-live="polite"
      >
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: CLUB_HUB_PAGE_BG }}>
        <ClubHubSkipLink />
        <ClubHubNav active={active} loginRedirect={loginRedirect} />
        <main id={CLUB_HUB_MAIN_ID} className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-xl font-bold text-neutral-900">{title}</h1>
          <p className="mt-2 text-sm text-neutral-700">{loginMessage}</p>
          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={`/login?redirectTo=${encodeURIComponent(loginRedirect)}`}
              className={`inline-block rounded-md px-4 py-2 text-sm font-semibold text-white ${clubHubButtonFocusClass}`}
              style={{ backgroundColor: CLUB_HUB_MAROON }}
            >
              Log in
            </Link>
            <Link
              href={`/signup?redirectTo=${encodeURIComponent(loginRedirect)}`}
              className={`inline-block rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 ${clubHubButtonFocusClass}`}
            >
              Sign up
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: CLUB_HUB_PAGE_BG }}>
      <ClubHubSkipLink />
      <ClubHubNav active={active} loginRedirect={loginRedirect} />
      <main id={CLUB_HUB_MAIN_ID} className="px-4 py-8 sm:px-6 lg:px-10">
        {children}
      </main>
    </div>
  );
}
