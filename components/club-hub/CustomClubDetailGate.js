"use client";

import { useCustomClubs } from "@/lib/club-hub/customClubs";
import { getClubBySlugForActiveSchool } from "@/lib/club-hub/directoryForSchool";
import ClubDetailView from "@/components/club-hub/ClubDetailView";

/** @param {{ slug: string }} props */
export default function CustomClubDetailGate({ slug }) {
  const { ready } = useCustomClubs();
  if (!ready) {
    return <p className="px-4 py-8 text-sm text-neutral-700">Loading club…</p>;
  }
  const club = getClubBySlugForActiveSchool(slug);
  if (!club) {
    return <p className="px-4 py-8 text-sm text-neutral-700">This club could not be found.</p>;
  }
  return <ClubDetailView club={club} slug={slug} />;
}
