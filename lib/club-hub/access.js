/**
 * Club Hub access — who can edit pages, see rosters, etc.
 *
 * Coordinators: clubHubAccess/{email}.isCoordinator === true (or built-in faculty email).
 * Sponsors: listed on the club in the directory / clubHubSponsors overrides.
 * Site admins: users.role admin + admin allowlist.
 *
 * Firestore write rules also need synced clubHubAccess.directoryClubSlugs for sponsors
 * (filled on login via /api/club-hub/sync-sponsor-access).
 */
import { normalizeEmail, emailsEqual } from "@/lib/email";
import { isAdminUser } from "@/utils/authorization";
import { getSponsorClubSlugsForEmail as resolveSponsorClubSlugsForEmail } from "@/lib/club-hub/clubSponsors";
import { BROAD_RUN_CLUBS, clubNameToSlug } from "@/lib/club-hub/broadRunClubDirectory";

/** Built-in club coordinator — always can edit all club pages. */
export const PROTECTED_CLUB_HUB_COORDINATOR_EMAIL = "katrice.white@lcps.org";

export const CLUB_HUB_ACCESS_COLLECTION = "clubHubAccess";

/** @param {string | null | undefined} email */
export function clubHubAccessDocId(email) {
  return normalizeEmail(email);
}

/** @param {string[]} slugs */
export function clubSlugsToMap(slugs) {
  /** @type {Record<string, boolean>} */
  const map = {};
  for (const slug of slugs) {
    if (slug) map[slug] = true;
  }
  return map;
}

/** @param {string | null | undefined} email @param {Record<string, { name: string, email: string }[]> | null | undefined} [overridesBySlug] */
export function getSponsorClubSlugsForEmail(email, overridesBySlug = null) {
  return resolveSponsorClubSlugsForEmail(email, overridesBySlug);
}

/** @param {string | null | undefined} email */
export function isProtectedClubHubCoordinator(email) {
  return emailsEqual(email, PROTECTED_CLUB_HUB_COORDINATOR_EMAIL);
}

/** Coordinator if their clubHubAccess doc has isCoordinator, or built-in faculty email. */
export function isClubHubCoordinatorEmail(email, accessRecord = null) {
  if (isProtectedClubHubCoordinator(email)) return true;
  return accessRecord?.isCoordinator === true;
}

/**
 * @param {Record<string, boolean> | null | undefined} slugMap
 * @param {string} slug
 */
function slugMapHas(slugMap, slug) {
  return Boolean(slugMap && slugMap[slug] === true);
}

/**
 * @param {Record<string, unknown> | null | undefined} accessRecord
 * @param {string} slug
 */
export function accessRecordAllowsClubSlug(accessRecord, slug) {
  if (!accessRecord || !slug) return false;
  return (
    slugMapHas(accessRecord.directoryClubSlugs, slug) ||
    slugMapHas(accessRecord.manualClubSlugs, slug) ||
    slugMapHas(accessRecord.clubSlugs, slug)
  );
}

/**
 * @param {{
 *   email?: string | null,
 *   slug: string,
 *   userData?: { role?: string } | null,
 *   accessRecord?: Record<string, unknown> | null,
 *   sponsorOverrides?: Record<string, { name: string, email: string }[]> | null,
 * }} args
 */
export function canEditClubHubPage({
  email,
  slug,
  userData = null,
  accessRecord = null,
  sponsorOverrides = null,
}) {
  if (!slug) return false;
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  if (userData && isAdminUser(userData.role, normalized)) return true;
  if (isClubHubCoordinatorEmail(normalized, accessRecord)) return true;
  if (accessRecordAllowsClubSlug(accessRecord, slug)) return true;
  return getSponsorClubSlugsForEmail(normalized, sponsorOverrides).includes(slug);
}

/**
 * @param {string | null | undefined} email
 * @param {{ role?: string } | null | undefined} userData
 */
export function canManageClubHubRoles(email, userData = null) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return Boolean(userData && isAdminUser(userData.role, normalized));
}

/**
 * Club Hub admin UI (rosters tab): site admins and club coordinators.
 * @param {{
 *   email?: string | null,
 *   userData?: { role?: string } | null,
 *   accessRecord?: Record<string, unknown> | null,
 * }} args
 */
export function canAccessClubHubAdminDashboard(args) {
  return (
    canManageClubHubRoles(args.email, args.userData) ||
    isClubHubCoordinatorEmail(args.email, args.accessRecord)
  );
}

/**
 * Club slugs the user can edit (sponsor, coordinator, manual grant, or site admin).
 * @param {{
 *   email?: string | null,
 *   userData?: { role?: string } | null,
 *   accessRecord?: Record<string, unknown> | null,
 *   sponsorOverrides?: Record<string, { name: string, email: string }[]> | null,
 * }} args
 */
export function getEditableClubSlugsForUser({
  email,
  userData = null,
  accessRecord = null,
  sponsorOverrides = null,
}) {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];

  const allSlugs = BROAD_RUN_CLUBS.map((club) => clubNameToSlug(club.name));
  if (userData && isAdminUser(userData.role, normalized)) return allSlugs;
  if (isClubHubCoordinatorEmail(normalized, accessRecord)) return allSlugs;

  /** @type {Set<string>} */
  const slugs = new Set(getSponsorClubSlugsForEmail(normalized, sponsorOverrides));
  for (const map of [accessRecord?.manualClubSlugs, accessRecord?.directoryClubSlugs]) {
    if (map && typeof map === "object") {
      for (const slug of Object.keys(map)) {
        if (map[slug]) slugs.add(slug);
      }
    }
  }
  return [...slugs].sort();
}

/**
 * @param {{
 *   email?: string | null,
 *   userData?: { role?: string } | null,
 *   accessRecord?: Record<string, unknown> | null,
 *   sponsorOverrides?: Record<string, { name: string, email: string }[]> | null,
 * }} args
 */
export function canAccessClubHubSponsorDashboard(args) {
  if (canManageClubHubRoles(args.email, args.userData)) return false;
  if (isClubHubCoordinatorEmail(args.email, args.accessRecord)) return false;
  return getEditableClubSlugsForUser(args).length > 0;
}
