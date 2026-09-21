"use client";

import ClubHubRostersPanel from "@/components/club-hub/ClubHubRostersPanel";
import { getSortedClubOptions } from "@/lib/club-hub/broadRunClubDirectory";

/**
 * @param {{ allowedSlugs: string[], accessLoading?: boolean }} props
 */
export default function ClubHubSponsorDashboard({ allowedSlugs, accessLoading = false }) {
  const clubOptions = getSortedClubOptions();

  if (accessLoading) {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }

  if (allowedSlugs.length === 0) {
    return (
      <p className="text-sm text-neutral-600">
        You do not have sponsor access to any clubs.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">My clubs</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          View member rosters and upcoming activity for clubs you sponsor or manage.
        </p>
      </div>
      <ClubHubRostersPanel mode="sponsor" clubOptions={clubOptions} allowedSlugs={allowedSlugs} />
    </div>
  );
}
