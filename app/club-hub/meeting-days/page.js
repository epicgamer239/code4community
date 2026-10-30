"use client";

import { useLayoutEffect } from "react";
import ClubHubNav from "@/components/club-hub/ClubHubNav";
import ClubHubSkipLink from "@/components/club-hub/ClubHubSkipLink";
import ClubMeetingDaysPanel from "@/components/club-hub/ClubMeetingDaysPanel";
import { CLUB_HUB_MAIN_ID } from "@/lib/club-hub/a11y";
import { CLUB_HUB_CARD } from "@/lib/club-hub/theme";

export default function ClubMeetingDaysPage() {
  useLayoutEffect(() => {
    document.title = "Seminar Clubs — Broad Run Club Hub";
  }, []);

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <ClubHubSkipLink />
      <ClubHubNav active="meeting-days" loginRedirect="/club-hub/meeting-days" />

      <main
        id={CLUB_HUB_MAIN_ID}
        className="mx-auto w-full max-w-2xl px-4 pb-16 pt-10 sm:px-6 sm:pt-12"
      >
        <div className={CLUB_HUB_CARD}>
          <h1 className="text-2xl font-bold text-neutral-900">Seminar Clubs</h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-700">
            You may join one Gold day club and one Maroon day club. General clubs are unlimited. Your
            seminar clubs below come from the clubs you have joined.
          </p>
          <div className="mt-6 border-t border-neutral-200 pt-6">
            <ClubMeetingDaysPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
