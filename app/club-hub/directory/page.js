"use client";

import { useLayoutEffect } from "react";
import Link from "next/link";
import BroadRunClubDirectory from "@/components/club-hub/BroadRunClubDirectory";
import ClubHubNav from "@/components/club-hub/ClubHubNav";
import ClubHubSkipLink from "@/components/club-hub/ClubHubSkipLink";
import { CLUB_HUB_MAIN_ID } from "@/lib/club-hub/a11y";

export default function ClubHubDirectoryPage() {
  useLayoutEffect(() => {
    document.title = "Broad Run Club Directory";
  }, []);

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <ClubHubSkipLink />
      <ClubHubNav active="directory" loginRedirect="/club-hub/directory" />

      <main
        id={CLUB_HUB_MAIN_ID}
        className="mx-auto w-full max-w-[90vw] px-4 pb-12 pt-10 sm:px-6 sm:pt-12"
      >
        <h1 className="sr-only">Broad Run Club Directory</h1>
        <BroadRunClubDirectory />
      </main>

      <footer className="border-t border-neutral-200 bg-white py-6 text-center text-xs text-neutral-700">
        <Link href="/club-hub" className="text-[#5c1417] hover:underline">
          ← Broad Run Club Hub
        </Link>
        <span className="mx-2 text-neutral-500" aria-hidden>
          ·
        </span>
        <Link href="/" className="hover:underline">
          Code4Community home
        </Link>
      </footer>
    </div>
  );
}
