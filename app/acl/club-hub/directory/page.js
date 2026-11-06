"use client";

import { useLayoutEffect } from "react";
import BroadRunClubDirectory from "@/components/club-hub/BroadRunClubDirectory";
import ClubHubNav from "@/components/club-hub/ClubHubNav";
import ClubHubSkipLink from "@/components/club-hub/ClubHubSkipLink";
import { CLUB_HUB_MAIN_ID } from "@/lib/club-hub/a11y";
import { useClubHubSchool } from "@/lib/club-hub/ClubHubSchoolProvider";

export default function AclClubHubDirectoryPage() {
  const school = useClubHubSchool();

  useLayoutEffect(() => {
    document.title = `${school.shortName} Club Directory`;
  }, [school.shortName]);

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <ClubHubSkipLink />
      <ClubHubNav active="directory" />

      <main
        id={CLUB_HUB_MAIN_ID}
        className="mx-auto w-full max-w-[90vw] px-4 pb-12 pt-10 sm:px-6 sm:pt-12"
      >
        <h1 className="sr-only">{school.shortName} Club Directory</h1>
        <BroadRunClubDirectory />
      </main>
    </div>
  );
}
