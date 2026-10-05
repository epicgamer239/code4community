"use client";

import { useState } from "react";
import Link from "next/link";
import ClubJoinConfirmDialog from "@/components/club-hub/ClubJoinConfirmDialog";
import { CLUB_HUB_MAROON } from "@/lib/club-hub/theme";
import { clubHubButtonFocusClass } from "@/lib/club-hub/a11y";

/**
 * @param {{
 *   slug: string,
 *   clubName: string,
 *   user: import("firebase/auth").User | null,
 *   authLoading: boolean,
 *   accessLoading: boolean,
 *   membershipLoading: boolean,
 *   isMember: boolean,
 *   joinBusy: boolean,
 *   onJoin: () => void | Promise<void>,
 *   onLeave: () => void | Promise<void>,
 * }} props
 */
export default function ClubMembershipButton({
  slug,
  clubName,
  user,
  authLoading,
  accessLoading,
  membershipLoading,
  isMember,
  joinBusy,
  onJoin,
  onLeave,
}) {
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  if (authLoading || accessLoading || membershipLoading) {
    return null;
  }

  if (user) {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            if (isMember) onLeave();
            else setJoinDialogOpen(true);
          }}
          disabled={joinBusy}
          aria-busy={joinBusy}
          aria-haspopup={isMember ? undefined : "dialog"}
          aria-label={isMember ? "Leave club" : "Join club"}
          className={`shrink-0 rounded-lg px-3 py-1 text-xs font-semibold shadow-sm sm:px-3.5 sm:py-1.5 sm:text-sm disabled:opacity-50 ${clubHubButtonFocusClass} ${
            isMember
              ? "border border-[#5c1417]/30 bg-white text-[#5c1417] hover:bg-rose-50"
              : "text-white hover:opacity-90"
          }`}
          style={isMember ? undefined : { backgroundColor: CLUB_HUB_MAROON }}
        >
          {joinBusy ? "Saving…" : isMember ? "Joined" : "Join club"}
        </button>

        <ClubJoinConfirmDialog
          key={joinDialogOpen ? "join-open" : "join-closed"}
          open={joinDialogOpen}
          clubName={clubName}
          busy={joinBusy}
          onClose={() => {
            if (!joinBusy) setJoinDialogOpen(false);
          }}
          onConfirm={async () => {
            try {
              await onJoin();
              setJoinDialogOpen(false);
            } catch {
              // Error surfaced on club page; keep dialog open.
            }
          }}
        />
      </>
    );
  }

  return (
    <Link
      href={`/login?redirectTo=${encodeURIComponent(`/club-hub/directory/${slug}`)}`}
      className={`shrink-0 rounded-lg px-3 py-1 text-xs font-semibold text-white shadow-sm hover:opacity-90 sm:px-3.5 sm:py-1.5 sm:text-sm ${clubHubButtonFocusClass}`}
      style={{ backgroundColor: CLUB_HUB_MAROON }}
    >
      Log in to join
    </Link>
  );
}
