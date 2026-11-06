import { describe, expect, it } from "vitest";
import {
  ACL_CLUB_HUB_CONFIG,
  BRHS_CLUB_HUB_CONFIG,
  getClubHubConfigBySchoolId,
} from "@/lib/club-hub/schoolConfig";
import { clubHubCol, runWithClubHubSchool } from "@/lib/club-hub/activeSchool";
import { lookupAclName } from "@/lib/acl/aclRoster";
import { filterAclRosterEntries, searchAclRoster } from "@/lib/acl/aclRosterSearch";

describe("ACL club hub config", () => {
  it("isolates ACL collections from BRHS", () => {
    const acl = getClubHubConfigBySchoolId("acl");
    expect(acl.schoolId).toBe("acl");
    expect(acl.basePath).toBe("/acl/club-hub");
    expect(acl.features.seminar).toBe(false);
    expect(acl.features.sheets).toBe(false);
    expect(acl.collections.memberships).toBe("aclClubHubMemberships");
    expect(acl.collections.memberships).not.toBe(BRHS_CLUB_HUB_CONFIG.collections.memberships);
    expect(Object.values(ACL_CLUB_HUB_CONFIG.collections).every((name) => name.startsWith("acl"))).toBe(
      true,
    );
  });

  it("routes clubHubCol through ALS for ACL", async () => {
    await runWithClubHubSchool(ACL_CLUB_HUB_CONFIG, () => {
      expect(clubHubCol("memberships")).toBe("aclClubHubMemberships");
      expect(clubHubCol("pages")).toBe("aclClubHubPages");
    });
    expect(clubHubCol("memberships")).toBe("clubHubMemberships");
  });
});

describe("ACL roster", () => {
  it("looks up scraped emails", () => {
    const entries = filterAclRosterEntries("");
    expect(entries.length).toBeGreaterThan(1000);
    const sample = entries[0];
    expect(lookupAclName(sample.email)).toBe(sample.displayName);
  });

  it("searches by name substring", () => {
    const hits = searchAclRoster("goldberg");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.name.toLowerCase().includes("goldberg"))).toBe(true);
  });
});
