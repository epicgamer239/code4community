import { describe, expect, it } from "vitest";
import { getEditableClubSlugsForUser } from "@/lib/club-hub/access";
import { clubNameToSlug } from "@/lib/club-hub/broadRunClubDirectory";

describe("getEditableClubSlugsForUser", () => {
  it("returns all slugs for site admin", () => {
    const slugs = getEditableClubSlugsForUser({
      email: "shail40926@gmail.com",
      userData: { role: "admin" },
      accessRecord: null,
      sponsorOverrides: null,
    });
    expect(slugs.length).toBeGreaterThan(50);
    expect(slugs).toContain(clubNameToSlug("Code4Community"));
  });

  it("includes override sponsor clubs", () => {
    const slugs = getEditableClubSlugsForUser({
      email: "timothy.cathcart@lcps.org",
      userData: { role: "student" },
      accessRecord: null,
      sponsorOverrides: {},
    });
    expect(slugs).toContain("advanced-leadership-program-alp");
  });

  it("merges manual and directory access maps", () => {
    const slugs = getEditableClubSlugsForUser({
      email: "editor@lcps.org",
      userData: { role: "student" },
      accessRecord: {
        manualClubSlugs: { "chess-club": true },
        directoryClubSlugs: { robotics: true },
      },
      sponsorOverrides: null,
    });
    expect(slugs).toEqual(["chess-club", "robotics"]);
  });
});
