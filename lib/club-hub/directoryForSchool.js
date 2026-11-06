import { getClubHubSchool } from "@/lib/club-hub/activeSchool";
import {
  getClubBySlug,
  getSortedClubOptions,
  listAllDirectoryClubs,
} from "@/lib/club-hub/broadRunClubDirectory";
import {
  getAclClubBySlug,
  getSortedAclClubOptions,
  listAllAclDirectoryClubs,
} from "@/lib/acl/aclClubDirectory";

/** @param {string} slug */
export function getClubBySlugForActiveSchool(slug) {
  return getClubHubSchool().schoolId === "acl"
    ? getAclClubBySlug(slug)
    : getClubBySlug(slug);
}

export function getSortedClubOptionsForActiveSchool() {
  return getClubHubSchool().schoolId === "acl"
    ? getSortedAclClubOptions()
    : getSortedClubOptions();
}

export function listDirectoryClubsForActiveSchool() {
  return getClubHubSchool().schoolId === "acl"
    ? listAllAclDirectoryClubs()
    : listAllDirectoryClubs();
}
