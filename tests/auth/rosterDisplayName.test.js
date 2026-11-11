import { describe, expect, it } from "vitest";
import {
  isPlaceholderDisplayName,
  lookupLcpsRosterName,
} from "@/lib/auth/rosterDisplayName";

describe("lookupLcpsRosterName", () => {
  it("finds ACL-only students that Broad Run roster misses", () => {
    expect(lookupLcpsRosterName("1019526@lcps.org")).toBe("Joshua Hart");
  });

  it("still finds Broad Run students", () => {
    expect(lookupLcpsRosterName("1019527@lcps.org")).toBe("Shruti Nimmagadda");
  });

  it("returns null for unknown emails", () => {
    expect(lookupLcpsRosterName("not-a-real-student@lcps.org")).toBeNull();
  });
});

describe("isPlaceholderDisplayName", () => {
  it("treats student-id local-part as a placeholder", () => {
    expect(isPlaceholderDisplayName("1019526", "1019526@lcps.org")).toBe(true);
    expect(isPlaceholderDisplayName("Joshua Hart", "1019526@lcps.org")).toBe(false);
  });
});
