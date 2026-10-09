import { describe, expect, it } from "vitest";
import {
  filterBroadRunRosterEntries,
  getBroadRunRosterEntries,
  searchBroadRunRoster,
} from "@/lib/club-hub/broadRunRosterSearch";

describe("getBroadRunRosterEntries", () => {
  it("returns a sorted non-empty roster", () => {
    const rows = getBroadRunRosterEntries();
    expect(rows.length).toBeGreaterThan(100);
    expect(rows[0].displayName.localeCompare(rows[1].displayName)).toBeLessThanOrEqual(0);
  });
});

describe("filterBroadRunRosterEntries", () => {
  it("returns full roster for empty query", () => {
    expect(filterBroadRunRosterEntries("").length).toBe(getBroadRunRosterEntries().length);
  });

  it("filters by name", () => {
    const hits = filterBroadRunRosterEntries("mathew");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.displayName.toLowerCase().includes("mathew"))).toBe(true);
  });
});

describe("searchBroadRunRoster", () => {
  it("returns empty for short queries", () => {
    expect(searchBroadRunRoster("a")).toEqual([]);
  });

  it("matches email substring", () => {
    const hits = searchBroadRunRoster("1089654");
    expect(hits.some((h) => h.email === "1089654@lcps.org")).toBe(true);
  });

  it("matches name substring", () => {
    const hits = searchBroadRunRoster("mathew");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].displayName.toLowerCase()).toContain("mathew");
  });
});
