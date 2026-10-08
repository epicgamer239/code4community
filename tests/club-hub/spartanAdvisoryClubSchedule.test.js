import { describe, expect, it } from "vitest";
import {
  mergeSpartanScheduleIntoEventsByDate,
  SPARTAN_ADVISORY_CLUB_SCHEDULE,
} from "@/lib/club-hub/spartanAdvisoryClubSchedule2026";

describe("spartanAdvisoryClubSchedule2026", () => {
  it("includes all published schedule rows", () => {
    expect(SPARTAN_ADVISORY_CLUB_SCHEDULE.length).toBe(39);
  });

  it("merges gold and planned events into the calendar map", () => {
    const merged = mergeSpartanScheduleIntoEventsByDate({}, "2026-10-01", "2026-10-31");
    expect(merged["2026-10-14"]?.some((e) => e.title === "Gold club meeting")).toBe(true);
    expect(merged["2026-10-28"]?.some((e) => e.title === "T.H.I.N.K Before You Speak")).toBe(true);
  });
});
