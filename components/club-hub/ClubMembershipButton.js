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
 *   joinBlocked?: boolean,
 *   joinBlockedLabel?: string,
 *   requiresApproval?: boolean,
 *   requestPending?: boolean,
 *   meetingDay?: "gold" | "maroon" | "both" | "general" | "",
 *   onJoin: (seminarDays: ("gold" | "maroon")[]) => void | Promise<void>,
 *   onLeave: () => void | Promise<void>,
 *   onCancelRequest?: () => void | Promise<void>,
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
  joinBlocked = false,
  joinBlockedLabel = "Full",
  requiresApproval = false,
  requestPending = false,
  meetingDay = "",
  onJoin,
  onLeave,
  onCancelRequest,
}) {
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  if (authLoading || accessLoading || membershipLoading) {
    return null;
  }

  if (user) {
    if (!isMember && joinBlocked) {
      return (
        <button
          type="button"
          disabled
          aria-disabled="true"
          title={joinBlockedLabel}
          className="shrink-0 cursor-not-allowed rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600 shadow-sm sm:px-3.5 sm:py-1.5 sm:text-sm"
        >
          {joinBlockedLabel}
        </button>
      );
    }

    if (!isMember && requestPending) {
      return (
        <button
          type="button"
          onClick={() => onCancelRequest?.()}
          disabled={joinBusy || !onCancelRequest}
          aria-busy={joinBusy}
          title="Cancel your join request"
          className={`shrink-0 rounded-lg border border-[#5c1417]/30 bg-white px-3 py-1 text-xs font-semibold text-[#5c1417] shadow-sm hover:bg-rose-50 disabled:opacity-50 sm:px-3.5 sm:py-1.5 sm:text-sm ${clubHubButtonFocusClass}`}
        >
          {joinBusy ? "Saving…" : "Requested"}
        </button>
      );
    }

    const joinLabel = requiresApproval ? "Request to join" : "Join club";

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
          aria-label={isMember ? "Leave club" : joinLabel}
          className={`shrink-0 rounded-lg px-3 py-1 text-xs font-semibold shadow-sm sm:px-3.5 sm:py-1.5 sm:text-sm disabled:opacity-50 ${clubHubButtonFocusClass} ${
            isMember
              ? "border border-[#5c1417]/30 bg-white text-[#5c1417] hover:bg-rose-50"
              : "text-white hover:opacity-90"
          }`}
          style={isMember ? undefined : { backgroundColor: CLUB_HUB_MAROON }}
        >
          {joinBusy ? "Saving…" : isMember ? "Joined" : joinLabel}
        </button>

        <ClubJoinConfirmDialog
          key={joinDialogOpen ? "join-open" : "join-closed"}
          open={joinDialogOpen}
          clubName={clubName}
          requestMode={requiresApproval}
          meetingDay={meetingDay}
          busy={joinBusy}
          onClose={() => {
            if (!joinBusy) setJoinDialogOpen(false);
          }}
          onConfirm={async (seminarDays) => {
            try {
              await onJoin(seminarDays);
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
