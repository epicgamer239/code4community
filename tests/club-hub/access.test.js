import { describe, expect, it } from "vitest";
import {
  canAccessClubHubAdminDashboard,
  canManageClubHubRoles,
  getEditableClubSlugsForUser,
} from "@/lib/club-hub/access";
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

  it("returns all slugs for club coordinator", () => {
    const slugs = getEditableClubSlugsForUser({
      email: "brhsc4c@gmail.com",
      userData: { role: "student" },
      accessRecord: { isCoordinator: true, manualClubSlugs: {}, directoryClubSlugs: {} },
      sponsorOverrides: null,
    });
    expect(slugs.length).toBeGreaterThan(50);
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

describe("canAccessClubHubAdminDashboard", () => {
  it("allows club coordinators without site admin role", () => {
    expect(
      canAccessClubHubAdminDashboard({
        email: "brhsc4c@gmail.com",
        userData: { role: "student" },
        accessRecord: { isCoordinator: true },
      }),
    ).toBe(true);
  });
});

describe("canManageClubHubRoles", () => {
  it("allows coordinators to manage Club Hub access like site admins", () => {
    expect(
      canManageClubHubRoles("brhsc4c@gmail.com", { role: "student" }, { isCoordinator: true }),
    ).toBe(true);
    expect(canManageClubHubRoles("brhsc4c@gmail.com", { role: "student" }, null)).toBe(false);
  });
});
