import { lookupBroadRunName } from "@/lib/club-hub/broadRunRoster";
import { normalizeEmail } from "@/lib/email";

/**
 * Schools on the forum. Students belong to a school only by appearing on its roster;
 * to add a school, add an entry with its own roster lookup.
 * @type {Record<string, {
 *   id: string,
 *   name: string,
 *   shortName: string,
 *   isOnRoster: (email: string) => boolean,
 *   lookupName: (email: string) => string | null,
 * }>}
 */
export const FORUM_SCHOOLS = {
  "broad-run": {
    id: "broad-run",
    name: "Broad Run High School",
    shortName: "BRHS",
    isOnRoster: (email) => Boolean(lookupBroadRunName(email)),
    lookupName: (email) => lookupBroadRunName(email),
  },
};

/** @param {string | null | undefined} schoolId */
export function getForumSchool(schoolId) {
  if (!schoolId || typeof schoolId !== "string") return null;
  return FORUM_SCHOOLS[schoolId] ?? null;
}

/**
 * School whose roster lists this email, or null.
 * @param {string | null | undefined} email
 */
export function rosterSchoolIdForEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  for (const school of Object.values(FORUM_SCHOOLS)) {
    if (school.isOnRoster(normalized)) return school.id;
  }
  return null;
}

export function listForumSchools() {
  return Object.values(FORUM_SCHOOLS).map(({ id, name, shortName }) => ({ id, name, shortName }));
}
