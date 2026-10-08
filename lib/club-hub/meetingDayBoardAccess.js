import { membershipHasBoardGroup } from "@/lib/club-hub/boardMembersClient";
import {
  GOLD_DIRECTORY_ENTRIES,
  MAROON_DIRECTORY_ENTRIES,
  isGoldDayClubSlug,
  isMaroonDayClubSlug,
} from "@/lib/club-hub/clubDirectorySections";

/** @param {string | undefined} labelSuffix */
function isBoardOnlyFairSuffix(labelSuffix) {
  return typeof labelSuffix === "string" && /\(Board only\)/i.test(labelSuffix);
}

/**
 * Board-only for meeting-day pick when every fair row for this slug on that day uses (Board only).
 * @param {import("@/lib/club-hub/clubDirectorySections").DirectoryEntry[]} entries
 * @param {string} slug
 */
export function meetingDayBoardOnlyForSlugOnFairDay(entries, slug) {
  const rows = entries.filter((e) => e.slug === slug);
  if (rows.length === 0) return false;
  if (rows.some((e) => !isBoardOnlyFairSuffix(e.labelSuffix))) return false;
  return rows.some((e) => isBoardOnlyFairSuffix(e.labelSuffix));
}

/** @param {string} slug */
export function requiresBoardForGoldMeetingPick(slug) {
  return meetingDayBoardOnlyForSlugOnFairDay(GOLD_DIRECTORY_ENTRIES, slug);
}

/** @param {string} slug */
export function requiresBoardForMaroonMeetingPick(slug) {
  return meetingDayBoardOnlyForSlugOnFairDay(MAROON_DIRECTORY_ENTRIES, slug);
}

/**
 * @param {{ clubSlug: string, memberGroups?: string[] }} membership
 */
export function canPickClubForGoldMeetingDay(membership) {
  const slug = membership.clubSlug?.trim();
  if (!slug || !isGoldDayClubSlug(slug)) return false;
  if (!requiresBoardForGoldMeetingPick(slug)) return true;
  return membershipHasBoardGroup(membership.memberGroups);
}

/**
 * @param {{ clubSlug: string, memberGroups?: string[] }} membership
 */
export function canPickClubForMaroonMeetingDay(membership) {
  const slug = membership.clubSlug?.trim();
  if (!slug || !isMaroonDayClubSlug(slug)) return false;
  if (!requiresBoardForMaroonMeetingPick(slug)) return true;
  return membershipHasBoardGroup(membership.memberGroups);
}

/** @param {typeof GOLD_DIRECTORY_ENTRIES} entries @param {(slug: string) => boolean} requires */
function collectBoardOnlySlugs(entries, requires) {
  /** @type {Set<string>} */
  const slugs = new Set();
  for (const entry of entries) slugs.add(entry.slug);
  return [...slugs].filter(requires);
}

/** Slug lists for Firestore rules — keep in sync with requiresBoard* helpers. */
export const FIRESTORE_GOLD_MEETING_BOARD_ONLY_SLUGS = collectBoardOnlySlugs(
  GOLD_DIRECTORY_ENTRIES,
  requiresBoardForGoldMeetingPick,
);

export const FIRESTORE_MAROON_MEETING_BOARD_ONLY_SLUGS = collectBoardOnlySlugs(
  MAROON_DIRECTORY_ENTRIES,
  requiresBoardForMaroonMeetingPick,
);
