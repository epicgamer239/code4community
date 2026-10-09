import { describe, expect, it } from "vitest";
import { searchBroadRunRoster } from "@/lib/club-hub/broadRunRosterSearch";

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
