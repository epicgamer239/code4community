"use client";

import { useLayoutEffect } from "react";
import Link from "next/link";
import ClubHubNav from "@/components/club-hub/ClubHubNav";
import ClubHubSkipLink from "@/components/club-hub/ClubHubSkipLink";
import ClubMeetingDaysPanel from "@/components/club-hub/ClubMeetingDaysPanel";
import { CLUB_HUB_MAIN_ID } from "@/lib/club-hub/a11y";

export default function ClubMeetingDaysPage() {
  useLayoutEffect(() => {
    document.title = "Gold & Maroon clubs — Broad Run Club Hub";
  }, []);

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <ClubHubSkipLink />
      <ClubHubNav active="meeting-days" loginRedirect="/club-hub/meeting-days" />

      <main
        id={CLUB_HUB_MAIN_ID}
        className="mx-auto w-full max-w-2xl px-4 pb-12 pt-10 sm:px-6"
      >
        <h1 className="text-2xl font-bold text-neutral-900">Meeting days</h1>
        <p className="mt-1 text-sm text-neutral-700">
          Tell us which joined clubs you attend on Gold and Maroon days.
        </p>
        <div className="mt-6">
          <ClubMeetingDaysPanel />
        </div>
      </main>

      <footer className="border-t border-neutral-200 bg-white py-6 text-center text-xs text-neutral-700">
        <Link href="/club-hub" className="text-[#5c1417] hover:underline">
          ← Broad Run Club Hub
        </Link>
      </footer>
    </div>
  );
}
