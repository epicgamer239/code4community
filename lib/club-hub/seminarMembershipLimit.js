import {
  getBoardOnlyClubJoinError,
} from "@/lib/club-hub/clubBoardGroups";
import { membershipHasBoardGroup } from "@/lib/club-hub/boardMembersClient";
import { getEffectiveMeetingDayForSlug } from "@/lib/club-hub/clubDirectorySections";
import {
  canPickClubForGoldMeetingDay,
  canPickClubForMaroonMeetingDay,
  requiresBoardForGoldMeetingPick,
  requiresBoardForMaroonMeetingPick,
} from "@/lib/club-hub/meetingDayBoardAccess";

/** @typedef {"gold" | "maroon"} SeminarDay */

/**
 * @param {unknown} raw
 * @returns {SeminarDay[] | null} null when unset (legacy membership)
 */
export function normalizeSeminarDays(raw) {
  if (!Array.isArray(raw)) return null;
  /** @type {SeminarDay[]} */
  const days = [];
  for (const item of raw) {
    if (item === "gold" && !days.includes("gold")) days.push("gold");
    if (item === "maroon" && !days.includes("maroon")) days.push("maroon");
  }
  return days;
}

/**
 * Default seminar days from the club's open meeting schedule, plus board-only
 * fair days when the member is on that club's board.
 * @param {string} clubSlug
 * @param {string[]} [memberGroups]
 * @returns {SeminarDay[]}
 */
export function defaultSeminarDaysForClub(clubSlug, memberGroups = []) {
  const meetingDay = getEffectiveMeetingDayForSlug(clubSlug);
  /** @type {SeminarDay[]} */
  const days = [];
  if (meetingDay === "gold" || meetingDay === "both") days.push("gold");
  if (meetingDay === "maroon" || meetingDay === "both") days.push("maroon");

  const membership = { clubSlug, memberGroups };
  if (!days.includes("gold") && canPickClubForGoldMeetingDay(membership)) {
    days.push("gold");
  }
  if (!days.includes("maroon") && canPickClubForMaroonMeetingDay(membership)) {
    days.push("maroon");
  }

  return days.filter((day) =>
    day === "gold"
      ? canPickClubForGoldMeetingDay(membership)
      : canPickClubForMaroonMeetingDay(membership),
  );
}

/**
 * @param {{ clubSlug: string, seminarDays?: unknown, memberGroups?: string[] }} membership
 * @returns {SeminarDay[]}
 */
export function resolveSeminarDays(membership) {
  const clubSlug = membership?.clubSlug || "";
  const memberGroups = membership?.memberGroups || [];
  const probe = { clubSlug, memberGroups };
  const explicit = normalizeSeminarDays(membership?.seminarDays);
  if (explicit) {
    return explicit.filter((day) =>
      day === "gold"
        ? canPickClubForGoldMeetingDay(probe)
        : canPickClubForMaroonMeetingDay(probe),
    );
  }
  return defaultSeminarDaysForClub(clubSlug, memberGroups);
}

/**
 * @param {string} clubSlug
 * @param {unknown} seminarDays
 * @returns {string} error or ""
 */
export function validateSeminarDaysForClub(clubSlug, seminarDays) {
  const meetingDay = getEffectiveMeetingDayForSlug(clubSlug);
  const days = normalizeSeminarDays(seminarDays);
  if (meetingDay === "general") {
    if (!days || days.length === 0) return "";
    for (const day of days) {
      if (day === "gold" && requiresBoardForGoldMeetingPick(clubSlug)) continue;
      if (day === "maroon" && requiresBoardForMaroonMeetingPick(clubSlug)) continue;
      return "General clubs do not use Gold or Maroon seminar days.";
    }
    return "";
  }
  if (!days || days.length === 0) {
    if (meetingDay === "both") {
      return "Pick Gold days only, Maroon days only, or both.";
    }
    return "";
  }
  if (meetingDay === "gold") {
    return days.length === 1 && days[0] === "gold"
      ? ""
      : "This club meets on Gold days only.";
  }
  if (meetingDay === "maroon") {
    return days.length === 1 && days[0] === "maroon"
      ? ""
      : "This club meets on Maroon days only.";
  }
  // both — also allow a single day, or board-only extras already validated by caller
  return "";
}

/**
 * Gold/Maroon seminar slots come from joined clubs (one each). General clubs are unlimited.
 * Board-only fair days (e.g. Key Club Gold) only count when the member has a board group.
 * Dual-day clubs honor the member's chosen seminarDays.
 *
 * @param {{ clubSlug: string, clubName?: string, memberGroups?: string[], seminarDays?: unknown }} membership
 */
export function seminarSlotsForMembership(membership) {
  const days = resolveSeminarDays(membership);
  return {
    gold: days.includes("gold") && canPickClubForGoldMeetingDay(membership),
    maroon: days.includes("maroon") && canPickClubForMaroonMeetingDay(membership),
  };
}

/**
 * @param {{ clubSlug: string, clubName?: string, memberGroups?: string[], seminarDays?: unknown }[]} memberships
 */
export function meetingChoicesFromMemberships(memberships) {
  let goldClubSlug = "";
  let maroonClubSlug = "";
  for (const membership of memberships || []) {
    const slots = seminarSlotsForMembership(membership);
    if (slots.gold && !goldClubSlug) goldClubSlug = membership.clubSlug;
    if (slots.maroon && !maroonClubSlug) maroonClubSlug = membership.clubSlug;
  }
  return { goldClubSlug, maroonClubSlug };
}

/**
 * @param {{ clubSlug: string, clubName?: string, memberGroups?: string[], seminarDays?: unknown }[]} memberships
 * @param {string} nextClubSlug
 * @param {{ memberGroups?: string[], seminarDays?: unknown }} [next]
 * @returns {string} error message or ""
 */
export function getSeminarMembershipJoinError(memberships, nextClubSlug, next = {}) {
  const slug = String(nextClubSlug || "").trim();
  if (!slug) return "";

  const memberGroups = next.memberGroups || [];
  const boardOnlyError = getBoardOnlyClubJoinError(slug);
  if (boardOnlyError && !membershipHasBoardGroup(memberGroups)) return boardOnlyError;

  const meetingDay = getEffectiveMeetingDayForSlug(slug);
  /** @type {SeminarDay[] | null} */
  let seminarDays = normalizeSeminarDays(next.seminarDays);
  if (seminarDays == null) {
    seminarDays = meetingDay === "both" ? null : defaultSeminarDaysForClub(slug, memberGroups);
  }
  if (meetingDay === "both" && (!seminarDays || seminarDays.length === 0)) {
    return "Pick Gold days only, Maroon days only, or both.";
  }
  const dayError = validateSeminarDaysForClub(slug, seminarDays ?? []);
  if (dayError) return dayError;

  const nextMembership = {
    clubSlug: slug,
    memberGroups,
    seminarDays: seminarDays ?? [],
  };
  const nextSlots = seminarSlotsForMembership(nextMembership);
  if (!nextSlots.gold && !nextSlots.maroon) return "";

  for (const membership of memberships || []) {
    if (membership.clubSlug === slug) continue;
    const slots = seminarSlotsForMembership(membership);
    const name = membership.clubName || membership.clubSlug;
    if (nextSlots.gold && slots.gold) {
      return `You can only join one Gold day club. Leave ${name} before joining another.`;
    }
    if (nextSlots.maroon && slots.maroon) {
      return `You can only join one Maroon day club. Leave ${name} before joining another.`;
    }
  }
  return "";
}
