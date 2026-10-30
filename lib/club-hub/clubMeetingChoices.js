/**
 * Pure helpers for Gold/Maroon seminar slot shapes.
 * Seminar slots are derived from clubHubMemberships (+ seminarDays) — there is no
 * clubHubMeetingChoices collection anymore.
 */
import {
  isGoldDayClubSlug,
  isMaroonDayClubSlug,
} from "@/lib/club-hub/clubDirectorySections";
import {
  requiresBoardForGoldMeetingPick,
  requiresBoardForMaroonMeetingPick,
} from "@/lib/club-hub/meetingDayBoardAccess";
import { membershipHasBoardGroup } from "@/lib/club-hub/boardMembersClient";

/** @deprecated Collection removed; kept only so older imports don't break at build time. */
export const CLUB_HUB_MEETING_CHOICES = "clubHubMeetingChoices";

/** @deprecated Switch cooldown applied to the old choices collection. */
export const MEETING_CHOICE_SWITCH_COOLDOWN_MS = 30 * 60 * 1000;

/** @param {string | undefined} oldVal @param {string | undefined} newVal */
export function meetingChoiceSwitchNeedsCooldown(oldVal, newVal) {
  const o = oldVal?.trim() || "";
  const n = newVal?.trim() || "";
  return Boolean(o && n && o !== n);
}

/** @param {{ toMillis?: () => number } | null | undefined} choicesUpdatedAt */
export function getMeetingChoiceSwitchBlockedUntilMs(choicesUpdatedAt, nowMs = Date.now()) {
  const base =
    choicesUpdatedAt && typeof choicesUpdatedAt.toMillis === "function"
      ? choicesUpdatedAt.toMillis()
      : null;
  if (!base) return 0;
  return Math.max(0, base + MEETING_CHOICE_SWITCH_COOLDOWN_MS - nowMs);
}

/**
 * @param {{ goldClubSlug: string, maroonClubSlug: string }} previous
 * @param {{ goldClubSlug: string, maroonClubSlug: string }} next
 * @param {{ toMillis?: () => number } | null | undefined} choicesUpdatedAt
 */
export function getMeetingChoiceSwitchError(previous, next, choicesUpdatedAt, nowMs) {
  const needs =
    meetingChoiceSwitchNeedsCooldown(previous.goldClubSlug, next.goldClubSlug) ||
    meetingChoiceSwitchNeedsCooldown(previous.maroonClubSlug, next.maroonClubSlug);
  if (!needs) return "";
  const remainingMs = getMeetingChoiceSwitchBlockedUntilMs(choicesUpdatedAt, nowMs);
  if (remainingMs <= 0) return "";
  const mins = Math.ceil(remainingMs / 60_000);
  return `You can switch meeting clubs again in ${mins} minute${mins === 1 ? "" : "s"}.`;
}

/** @param {unknown} raw */
export function normalizeMeetingChoices(raw) {
  if (!raw || typeof raw !== "object") {
    return { goldClubSlug: "", maroonClubSlug: "", choicesUpdatedAt: null };
  }
  const goldClubSlug =
    typeof raw.goldClubSlug === "string" ? raw.goldClubSlug.trim().slice(0, 120) : "";
  const maroonClubSlug =
    typeof raw.maroonClubSlug === "string" ? raw.maroonClubSlug.trim().slice(0, 120) : "";
  const choicesUpdatedAt = raw.choicesUpdatedAt ?? null;
  return { goldClubSlug, maroonClubSlug, choicesUpdatedAt };
}

/**
 * @param {{ goldClubSlug: string, maroonClubSlug: string }} choices
 * @param {Set<string>} joinedSlugs
 * @param {import("@/lib/club-hub/clubMemberships").NormalizedClubMembership[]} [memberships]
 */
export function validateMeetingChoices(choices, joinedSlugs, memberships = []) {
  const gold = choices.goldClubSlug?.trim() || "";
  const maroon = choices.maroonClubSlug?.trim() || "";

  /** @param {string} slug */
  const membershipFor = (slug) => memberships.find((m) => m.clubSlug === slug) || null;

  if (gold && (!joinedSlugs.has(gold) || !isGoldDayClubSlug(gold))) {
    return "Pick a Gold day club you have joined.";
  }
  if (
    gold &&
    requiresBoardForGoldMeetingPick(gold) &&
    !membershipHasBoardGroup(membershipFor(gold)?.memberGroups)
  ) {
    return "That Gold day club is for board members only.";
  }

  if (maroon && (!joinedSlugs.has(maroon) || !isMaroonDayClubSlug(maroon))) {
    return "Pick a Maroon day club you have joined.";
  }
  if (
    maroon &&
    requiresBoardForMaroonMeetingPick(maroon) &&
    !membershipHasBoardGroup(membershipFor(maroon)?.memberGroups)
  ) {
    return "That Maroon day club is for board members only.";
  }
  return "";
}

/**
 * @param {{ goldClubSlug: string, maroonClubSlug: string }} choices
 * @param {string} clubSlug
 */
export function meetingChoicesAfterLeavingClub(choices, clubSlug) {
  const slug = clubSlug?.trim();
  if (!slug) {
    return { goldClubSlug: choices.goldClubSlug, maroonClubSlug: choices.maroonClubSlug, changed: false };
  }
  const goldClubSlug = choices.goldClubSlug === slug ? "" : choices.goldClubSlug;
  const maroonClubSlug = choices.maroonClubSlug === slug ? "" : choices.maroonClubSlug;
  return {
    goldClubSlug,
    maroonClubSlug,
    changed: goldClubSlug !== choices.goldClubSlug || maroonClubSlug !== choices.maroonClubSlug,
  };
}

/**
 * Drop Gold/Maroon picks that are no longer valid for the student's remaining memberships.
 *
 * @param {{ goldClubSlug: string, maroonClubSlug: string }} choices
 * @param {import("@/lib/club-hub/clubMemberships").NormalizedClubMembership[]} memberships
 */
export function reconcileMeetingChoicesWithMemberships(choices, memberships) {
  const joinedSlugs = new Set(memberships.map((m) => m.clubSlug));
  let goldClubSlug = choices.goldClubSlug || "";
  let maroonClubSlug = choices.maroonClubSlug || "";

  if (
    goldClubSlug &&
    validateMeetingChoices({ goldClubSlug, maroonClubSlug: "" }, joinedSlugs, memberships)
  ) {
    goldClubSlug = "";
  }
  if (
    maroonClubSlug &&
    validateMeetingChoices({ goldClubSlug: "", maroonClubSlug }, joinedSlugs, memberships)
  ) {
    maroonClubSlug = "";
  }

  return {
    goldClubSlug,
    maroonClubSlug,
    changed:
      goldClubSlug !== (choices.goldClubSlug || "") ||
      maroonClubSlug !== (choices.maroonClubSlug || ""),
  };
}
