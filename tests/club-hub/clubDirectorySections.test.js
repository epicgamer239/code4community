import { describe, expect, it } from "vitest";
import { getClubsGroupedByMeetingDay } from "@/lib/club-hub/clubDirectorySections";
import { BROAD_RUN_CLUBS, clubNameToSlug } from "@/lib/club-hub/broadRunClubDirectory";

describe("getClubsGroupedByMeetingDay", () => {
  it("puts every directory club in exactly one primary bucket or both day buckets", () => {
    const { gold, maroon, general } = getClubsGroupedByMeetingDay();
    const covered = new Set([
      ...gold.map((c) => clubNameToSlug(c.name)),
      ...maroon.map((c) => clubNameToSlug(c.name)),
      ...general.map((c) => clubNameToSlug(c.name)),
    ]);
    for (const club of BROAD_RUN_CLUBS) {
      expect(covered.has(clubNameToSlug(club.name))).toBe(true);
    }
  });

  it("lists DECA on both gold and maroon days", () => {
    const { gold, maroon } = getClubsGroupedByMeetingDay();
    expect(gold.some((c) => c.name === "DECA")).toBe(true);
    expect(maroon.some((c) => c.name === "DECA")).toBe(true);
  });
});
