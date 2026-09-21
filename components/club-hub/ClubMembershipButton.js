"use client";

import Link from "next/link";
import { CLUB_HUB_MAROON } from "@/lib/club-hub/theme";

/**
 * @param {{
 *   slug: string,
 *   user: import("firebase/auth").User | null,
 *   userData: Record<string, unknown> | null,
 *   authLoading: boolean,
 *   accessLoading: boolean,
 *   membershipLoading: boolean,
 *   isMember: boolean,
 *   joinBusy: boolean,
 *   onJoinLeave: () => void,
 * }} props
 */
export default function ClubMembershipButton({
  slug,
  user,
  authLoading,
  accessLoading,
  membershipLoading,
  isMember,
  joinBusy,
  onJoinLeave,
}) {
  if (authLoading || accessLoading || membershipLoading) {
    return null;
  }

  if (user) {
    return (
      <button
        type="button"
        onClick={onJoinLeave}
        disabled={joinBusy}
        className={`shrink-0 rounded-lg px-3 py-1 text-xs font-semibold shadow-sm sm:px-3.5 sm:py-1.5 sm:text-sm disabled:opacity-50 ${
          isMember
            ? "border border-[#5c1417]/30 bg-white text-[#5c1417] hover:bg-rose-50"
            : "text-white hover:opacity-90"
        }`}
        style={isMember ? undefined : { backgroundColor: CLUB_HUB_MAROON }}
      >
        {joinBusy ? "Saving…" : isMember ? "Joined" : "Join club"}
      </button>
    );
  }

  return (
    <Link
      href={`/login?redirectTo=${encodeURIComponent(`/club-hub/directory/${slug}`)}`}
      className="shrink-0 rounded-lg px-3 py-1 text-xs font-semibold text-white shadow-sm hover:opacity-90 sm:px-3.5 sm:py-1.5 sm:text-sm"
      style={{ backgroundColor: CLUB_HUB_MAROON }}
    >
      Log in to join
    </Link>
  );
}
