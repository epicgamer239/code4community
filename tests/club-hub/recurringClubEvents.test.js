import { describe, expect, it } from "vitest";
import { expandRecurringEventDates } from "@/lib/club-hub/recurringClubEvents";

describe("expandRecurringEventDates", () => {
  it("returns a single date when recurrence is none", () => {
    expect(
      expandRecurringEventDates({
        startDate: "2026-09-02",
        recurrence: "none",
      }),
    ).toEqual(["2026-09-02"]);
  });

  it("expands weekly Wed and Thu from a Wednesday anchor", () => {
    const dates = expandRecurringEventDates({
      startDate: "2026-09-02",
      recurrence: "weekly",
      weeklyDays: [3, 4],
      endDate: "2026-09-17",
    });
    expect(dates).toContain("2026-09-02");
    expect(dates).toContain("2026-09-03");
    expect(dates).toContain("2026-09-09");
    expect(dates).toContain("2026-09-10");
    expect(dates).not.toContain("2026-09-04");
  });

  it("expands monthly same-weekday from first Thursday", () => {
    const dates = expandRecurringEventDates({
      startDate: "2026-10-01",
      recurrence: "monthly",
      monthlyMode: "same-weekday",
      endDate: "2026-12-31",
    });
    expect(dates).toEqual(["2026-10-01", "2026-11-05", "2026-12-03"]);
  });
});
