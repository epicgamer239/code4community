import {
  GOLD_DIRECTORY_ENTRIES,
  MAROON_DIRECTORY_ENTRIES,
  getGoldDirectoryEntries,
  getMaroonDirectoryEntries,
} from "@/lib/club-hub/clubDirectorySections";

/** Firestore membership group id for exec/board roster segment. */
export const CLUB_MEMBER_GROUP_BOARD = "board";

/** @param {string | undefined} suffix */
function isBoardOnlySuffix(suffix) {
  return typeof suffix === "string" && /\(Board only\)/i.test(suffix);
}

/** Clubs that have a distinct board member group on the roster. */
export const CLUB_SLUGS_WITH_BOARD_MEMBER_GROUP = new Set(
  [...GOLD_DIRECTORY_ENTRIES, ...MAROON_DIRECTORY_ENTRIES]
    .filter((entry) => isBoardOnlySuffix(entry.labelSuffix))
    .map((entry) => entry.slug),
);

/** @param {string} clubSlug */
export function clubHasBoardMemberGroup(clubSlug) {
  return CLUB_SLUGS_WITH_BOARD_MEMBER_GROUP.has(clubSlug);
}

/**
 * Clubs whose only Gold/Maroon fair rows are "(Board only)" — e.g. Key Club.
 * Students cannot self-join; the sponsor adds them to the board list (which
 * creates membership). Keep in sync with firestore clubHubJoinRequiresBoardInvite.
 *
 * @param {string} clubSlug
 */
export function clubRequiresBoardToJoin(clubSlug) {
  const slug = String(clubSlug || "").trim();
  if (!slug || !clubHasBoardMemberGroup(slug)) return false;

  const goldRows = getGoldDirectoryEntries().filter((e) => e.slug === slug);
  const maroonRows = getMaroonDirectoryEntries().filter((e) => e.slug === slug);
  if (goldRows.length === 0 && maroonRows.length === 0) return false;

  const hasOpen =
    goldRows.some((e) => !isBoardOnlySuffix(e.labelSuffix)) ||
    maroonRows.some((e) => !isBoardOnlySuffix(e.labelSuffix));
  return !hasOpen;
}

/** @param {string} clubSlug */
export function getBoardOnlyClubJoinError(clubSlug) {
  if (!clubRequiresBoardToJoin(clubSlug)) return "";
  return "This club is board only. Ask the sponsor to add you to the board list.";
}
