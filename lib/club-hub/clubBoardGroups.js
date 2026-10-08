import {
  GOLD_DIRECTORY_ENTRIES,
  MAROON_DIRECTORY_ENTRIES,
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
