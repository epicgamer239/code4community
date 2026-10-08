import { describe, expect, it } from "vitest";
import {
  getClubsGroupedByMeetingDay,
  isMaroonDayClubSlug,
  MAROON_DIRECTORY_ENTRIES,
} from "@/lib/club-hub/clubDirectorySections";
import { requiresBoardForMaroonMeetingPick } from "@/lib/club-hub/meetingDayBoardAccess";
import { BROAD_RUN_CLUBS, clubNameToSlug } from "@/lib/club-hub/broadRunClubDirectory";

describe("getClubsGroupedByMeetingDay", () => {
  it("covers every directory club in gold, maroon, or general", () => {
    const { gold, maroon, general } = getClubsGroupedByMeetingDay();
    const covered = new Set([
      ...gold.map((c) => c.slug),
      ...maroon.map((c) => c.slug),
      ...general.map((c) => c.slug),
    ]);
    for (const club of BROAD_RUN_CLUBS) {
      expect(covered.has(clubNameToSlug(club.name))).toBe(true);
    }
  });

  it("lists DECA on both gold and maroon days", () => {
    const { gold, maroon } = getClubsGroupedByMeetingDay();
    expect(gold.some((c) => c.slug === "deca")).toBe(true);
    expect(maroon.some((c) => c.slug === "deca")).toBe(true);
  });

  it("lists BSU twice on maroon vs gold with (Board only) label only on maroon", () => {
    const { gold, maroon } = getClubsGroupedByMeetingDay();
    const goldBsu = gold.filter((c) => c.slug === "black-student-union-bsu");
    const maroonBsu = maroon.filter((c) => c.slug === "black-student-union-bsu");
    expect(goldBsu).toHaveLength(1);
    expect(maroonBsu).toHaveLength(1);
    expect(goldBsu[0].name).not.toMatch(/\(Board only\)/i);
    expect(maroonBsu[0].name).toMatch(/\(Board only\)/i);
  });

  it("lists Interact in General and Maroon (Board only); Maroon meeting pick is board-only", () => {
    const { general, maroon } = getClubsGroupedByMeetingDay();
    expect(general.some((c) => c.slug === "interact")).toBe(true);
    expect(general.find((c) => c.slug === "interact")?.name).toBe("Interact");
    const maroonInteract = maroon.filter((c) => c.slug === "interact");
    expect(maroonInteract).toHaveLength(1);
    expect(maroonInteract[0].name).toMatch(/\(Board only\)/i);
    expect(isMaroonDayClubSlug("interact")).toBe(true);
    expect(requiresBoardForMaroonMeetingPick("interact")).toBe(true);
  });

  it("lists Key Club in General and Gold (Board only)", () => {
    const { general, gold } = getClubsGroupedByMeetingDay();
    expect(general.some((c) => c.slug === "key-club")).toBe(true);
    expect(general.find((c) => c.slug === "key-club")?.name).toBe("Key Club");
    const goldKey = gold.filter((c) => c.slug === "key-club");
    expect(goldKey).toHaveLength(1);
    expect(goldKey[0].name).toMatch(/\(Board only\)/i);
  });
});
