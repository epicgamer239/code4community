import { afterEach, describe, expect, it } from "vitest";
import {
  getClubsGroupedByMeetingDay,
  getEffectiveMeetingDayForSlug,
  isGoldDayClubSlug,
  isMaroonDayClubSlug,
  meetingChoicesAfterClubDayChange,
  MAROON_DIRECTORY_ENTRIES,
  setMeetingDayOverrides,
} from "@/lib/club-hub/clubDirectorySections";
import { requiresBoardForMaroonMeetingPick } from "@/lib/club-hub/meetingDayBoardAccess";
import { BROAD_RUN_CLUBS, clubNameToSlug } from "@/lib/club-hub/broadRunClubDirectory";
import { setCustomClubs } from "@/lib/club-hub/customClubStore";
import { setRemovedClubSlugs } from "@/lib/club-hub/removedClubsStore";

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

  it("lists Baking Club in General and not on Maroon", () => {
    const { general, maroon } = getClubsGroupedByMeetingDay();
    expect(general.some((c) => c.slug === "baking-club")).toBe(true);
    expect(maroon.some((c) => c.slug === "baking-club")).toBe(false);
    expect(isMaroonDayClubSlug("baking-club")).toBe(false);
  });

  it("lists Green Team in General and keeps Sports Talk off Maroon", () => {
    const { general, gold, maroon } = getClubsGroupedByMeetingDay();
    expect(general.some((c) => c.slug === "green-team")).toBe(true);
    expect(general.find((c) => c.slug === "green-team")?.name).toBe("Green Team");
    expect(gold.some((c) => c.slug === "sports-talk")).toBe(true);
    expect(maroon.some((c) => c.slug === "sports-talk")).toBe(false);
    expect(isMaroonDayClubSlug("sports-talk")).toBe(false);
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

describe("admin meeting-day overrides", () => {
  afterEach(() => {
    setMeetingDayOverrides({});
    setCustomClubs([]);
    setRemovedClubSlugs([]);
  });

  it("moves a General club to Gold", () => {
    setMeetingDayOverrides({ "baking-club": "gold" });
    const { general, gold, maroon } = getClubsGroupedByMeetingDay();
    expect(gold.some((c) => c.slug === "baking-club")).toBe(true);
    expect(general.some((c) => c.slug === "baking-club")).toBe(false);
    expect(maroon.some((c) => c.slug === "baking-club")).toBe(false);
    expect(isGoldDayClubSlug("baking-club")).toBe(true);
  });

  it("moves a Gold club to General", () => {
    setMeetingDayOverrides({ "sports-talk": "general" });
    const { general, gold } = getClubsGroupedByMeetingDay();
    expect(gold.some((c) => c.slug === "sports-talk")).toBe(false);
    expect(general.some((c) => c.slug === "sports-talk")).toBe(true);
    expect(isGoldDayClubSlug("sports-talk")).toBe(false);
  });

  it("puts a club on both days and keeps default labels", () => {
    setMeetingDayOverrides({ deca: "maroon", "sports-talk": "both" });
    const { gold, maroon } = getClubsGroupedByMeetingDay();
    expect(gold.some((c) => c.slug === "deca")).toBe(false);
    expect(maroon.some((c) => c.slug === "deca")).toBe(true);
    expect(gold.some((c) => c.slug === "sports-talk")).toBe(true);
    expect(maroon.some((c) => c.slug === "sports-talk")).toBe(true);
    expect(isMaroonDayClubSlug("sports-talk")).toBe(true);
  });

  it("lists an admin-created club on the day it meets", () => {
    setCustomClubs([
      {
        slug: "robotics-plus",
        name: "Robotics Plus",
        meetingDay: "gold",
        sponsors: [{ name: "Ada Lovelace", email: "ada@lcps.org" }],
      },
    ]);
    setMeetingDayOverrides({ "robotics-plus": "gold" });
    const { gold, general } = getClubsGroupedByMeetingDay();
    expect(gold.some((club) => club.slug === "robotics-plus")).toBe(true);
    expect(general.some((club) => club.slug === "robotics-plus")).toBe(false);
    expect(isGoldDayClubSlug("robotics-plus")).toBe(true);
  });

  it("ignores invalid override values", () => {
    setMeetingDayOverrides({ "baking-club": "purple" });
    expect(getEffectiveMeetingDayForSlug("baking-club")).toBe("general");
  });
});

describe("meetingChoicesAfterClubDayChange", () => {
  it("clears a maroon signup when the club no longer meets on maroon", () => {
    expect(
      meetingChoicesAfterClubDayChange(
        { goldClubSlug: "sports-talk", maroonClubSlug: "baking-club" },
        "baking-club",
        "general",
      ),
    ).toEqual({
      goldClubSlug: "sports-talk",
      maroonClubSlug: "",
      changed: true,
    });
  });

  it("keeps the gold signup when the club stays on gold", () => {
    expect(
      meetingChoicesAfterClubDayChange(
        { goldClubSlug: "sports-talk", maroonClubSlug: "" },
        "sports-talk",
        "gold",
      ).changed,
    ).toBe(false);
  });

  it("clears only the day a both-day club leaves", () => {
    expect(
      meetingChoicesAfterClubDayChange(
        { goldClubSlug: "deca", maroonClubSlug: "deca" },
        "deca",
        "gold",
      ),
    ).toEqual({
      goldClubSlug: "deca",
      maroonClubSlug: "",
      changed: true,
    });
  });
});
