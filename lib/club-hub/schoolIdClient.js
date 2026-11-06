import { getClubHubSchool } from "@/lib/club-hub/activeSchool";

/** Query string fragment including leading `&` when appending, or full `schoolId=…` alone. */
export function clubHubSchoolIdQuery(prefix = "") {
  const q = `schoolId=${encodeURIComponent(getClubHubSchool().schoolId)}`;
  return prefix ? `${prefix}${q}` : q;
}

/** @param {Record<string, unknown>} [body] */
export function withClubHubSchoolId(body = {}) {
  return { ...body, schoolId: getClubHubSchool().schoolId };
}
