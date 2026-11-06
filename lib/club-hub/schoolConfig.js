/**
 * Club Hub school profiles (BRHS default + ACL).
 * Collection names differ so schools never share Firestore docs.
 */

/** @typedef {{
 *   primary: string,
 *   primaryDark: string,
 *   accent: string,
 *   accentSoft: string,
 *   heading: string,
 *   bannerImage: string,
 *   bannerAlt: string,
 *   defaultClubHeaderImage: string,
 * }} ClubHubBrand */

/** @typedef {{
 *   schoolId: string,
 *   shortName: string,
 *   schoolName: string,
 *   hubName: string,
 *   basePath: string,
 *   features: { seminar: boolean, sheets: boolean, meetingDaysNav: boolean, resources: boolean, activityBus: boolean },
 *   brand: ClubHubBrand,
 *   collections: Record<string, string>,
 * }} ClubHubSchoolConfig */

/** @type {ClubHubSchoolConfig} */
export const BRHS_CLUB_HUB_CONFIG = {
  schoolId: "broad-run",
  shortName: "BRHS",
  schoolName: "Broad Run High School",
  hubName: "Broad Run Club Hub",
  basePath: "/club-hub",
  features: {
    seminar: true,
    sheets: true,
    meetingDaysNav: true,
    resources: true,
    activityBus: true,
  },
  brand: {
    primary: "#5c1417",
    primaryDark: "#3f0e10",
    accent: "#5c1417",
    accentSoft: "#731a1f",
    heading: "#1a365d",
    bannerImage: "/brand/brh.png",
    bannerAlt: "Broad Run High School, Ashburn, Virginia",
    defaultClubHeaderImage: "/brand/brh.png",
  },
  collections: {
    memberships: "clubHubMemberships",
    membershipCounts: "clubHubMembershipCounts",
    pages: "clubHubPages",
    events: "clubHubEvents",
    access: "clubHubAccess",
    sponsors: "clubHubSponsors",
    customClubs: "clubHubCustomClubs",
    removedClubs: "clubHubRemovedClubs",
    joinRequests: "clubHubJoinRequests",
    boardMembers: "clubHubBoardMembers",
    boardMembersByEmail: "clubHubBoardMembersByEmail",
    opportunityEvents: "clubHubOpportunityEvents",
    manualRankings: "clubHubManualRankings",
    meetingDays: "clubHubMeetingDays",
    specialSheetEvents: "clubHubSpecialSheetEvents",
  },
};

/** ACL colors from school branding: navy, teal, green. */
/** @type {ClubHubSchoolConfig} */
export const ACL_CLUB_HUB_CONFIG = {
  schoolId: "acl",
  shortName: "ACL",
  schoolName: "Academies of Loudoun",
  hubName: "Academies Club Hub",
  basePath: "/acl/club-hub",
  features: {
    seminar: false,
    sheets: false,
    meetingDaysNav: false,
    resources: false,
    activityBus: false,
  },
  brand: {
    primary: "#013367",
    primaryDark: "#0e315c",
    accent: "#0080b8",
    accentSoft: "#0592cc",
    heading: "#013367",
    bannerImage: "/acl/campus-banner.jpg",
    bannerAlt: "Academies of Loudoun campus",
    defaultClubHeaderImage: "/acl/campus-header.jpg",
  },
  collections: {
    memberships: "aclClubHubMemberships",
    membershipCounts: "aclClubHubMembershipCounts",
    pages: "aclClubHubPages",
    events: "aclClubHubEvents",
    access: "aclClubHubAccess",
    sponsors: "aclClubHubSponsors",
    customClubs: "aclClubHubCustomClubs",
    removedClubs: "aclClubHubRemovedClubs",
    joinRequests: "aclClubHubJoinRequests",
    boardMembers: "aclClubHubBoardMembers",
    boardMembersByEmail: "aclClubHubBoardMembersByEmail",
    opportunityEvents: "aclClubHubOpportunityEvents",
    manualRankings: "aclClubHubManualRankings",
    // Unused when seminar/sheets are off; kept so callers don't crash.
    meetingDays: "aclClubHubMeetingDays",
    specialSheetEvents: "aclClubHubSpecialSheetEvents",
  },
};

/** @param {string | null | undefined} schoolId */
export function getClubHubConfigBySchoolId(schoolId) {
  if (schoolId === "acl") return ACL_CLUB_HUB_CONFIG;
  return BRHS_CLUB_HUB_CONFIG;
}
