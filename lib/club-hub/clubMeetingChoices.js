import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { firestore } from "@/firebase";
import {
  isGoldDayClubSlug,
  isMaroonDayClubSlug,
} from "@/lib/club-hub/clubDirectorySections";
import {
  requiresBoardForGoldMeetingPick,
  requiresBoardForMaroonMeetingPick,
} from "@/lib/club-hub/meetingDayBoardAccess";
import { membershipHasBoardGroup } from "@/lib/club-hub/boardMembersClient";
import { assertClientRateLimit } from "@/utils/clientRateLimit";

export const CLUB_HUB_MEETING_CHOICES = "clubHubMeetingChoices";

/** 30 minutes between switching one club to another (not first pick or leave clears). */
export const MEETING_CHOICE_SWITCH_COOLDOWN_MS = 30 * 60 * 1000;

/** @param {string | undefined} oldVal @param {string | undefined} newVal */
export function meetingChoiceSwitchNeedsCooldown(oldVal, newVal) {
  const o = oldVal?.trim() || "";
  const n = newVal?.trim() || "";
  return Boolean(o && n && o !== n);
}

/** @param {import("firebase/firestore").Timestamp | null | undefined} choicesUpdatedAt */
export function getMeetingChoiceSwitchBlockedUntilMs(choicesUpdatedAt, nowMs = Date.now()) {
  const base =
    choicesUpdatedAt instanceof Timestamp
      ? choicesUpdatedAt.toMillis()
      : choicesUpdatedAt?.toMillis?.();
  if (!base) return 0;
  return Math.max(0, base + MEETING_CHOICE_SWITCH_COOLDOWN_MS - nowMs);
}

/**
 * @param {{ goldClubSlug: string, maroonClubSlug: string }} previous
 * @param {{ goldClubSlug: string, maroonClubSlug: string }} next
 * @param {import("firebase/firestore").Timestamp | null | undefined} choicesUpdatedAt
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

/** @param {string} userId */
export async function fetchMeetingChoices(userId) {
  if (!firestore || !userId) {
    return { goldClubSlug: "", maroonClubSlug: "", choicesUpdatedAt: null };
  }
  const snap = await getDoc(doc(firestore, CLUB_HUB_MEETING_CHOICES, userId));
  if (!snap.exists()) return { goldClubSlug: "", maroonClubSlug: "", choicesUpdatedAt: null };
  return normalizeMeetingChoices(snap.data());
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
 * @param {{
 *   userId: string,
 *   goldClubSlug: string,
 *   maroonClubSlug: string,
 *   joinedSlugs: Set<string>,
 *   memberships?: import("@/lib/club-hub/clubMemberships").NormalizedClubMembership[],
 * }} args
 */
export async function saveMeetingChoices(args) {
  if (!firestore) throw new Error("Firebase is not configured.");
  const userId = args.userId?.trim();
  if (!userId) throw new Error("Missing user.");

  const ref = doc(firestore, CLUB_HUB_MEETING_CHOICES, userId);
  const existingSnap = await getDoc(ref);
  const previous = existingSnap.exists()
    ? normalizeMeetingChoices(existingSnap.data())
    : { goldClubSlug: "", maroonClubSlug: "", choicesUpdatedAt: null };

  const choices = normalizeMeetingChoices({
    goldClubSlug: args.goldClubSlug,
    maroonClubSlug: args.maroonClubSlug,
  });
  const err = validateMeetingChoices(choices, args.joinedSlugs, args.memberships || []);
  if (err) throw new Error(err);

  const cooldownErr = getMeetingChoiceSwitchError(previous, choices, previous.choicesUpdatedAt);
  if (cooldownErr) throw new Error(cooldownErr);

  assertClientRateLimit("clubHubMeetingChoicesWrite", userId);

  const switched =
    meetingChoiceSwitchNeedsCooldown(previous.goldClubSlug, choices.goldClubSlug) ||
    meetingChoiceSwitchNeedsCooldown(previous.maroonClubSlug, choices.maroonClubSlug);

  await setDoc(
    ref,
    {
      goldClubSlug: choices.goldClubSlug,
      maroonClubSlug: choices.maroonClubSlug,
      updatedAt: serverTimestamp(),
      choicesUpdatedAt: switched
        ? serverTimestamp()
        : previous.choicesUpdatedAt || serverTimestamp(),
    },
    { merge: true },
  );
  return choices;
}

/** @param {string} userId @param {string} clubSlug */
export async function clearMeetingChoiceForClub(userId, clubSlug) {
  if (!firestore || !userId || !clubSlug) return;
  const ref = doc(firestore, CLUB_HUB_MEETING_CHOICES, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const current = normalizeMeetingChoices(snap.data());
  const updates = {};
  if (current.goldClubSlug === clubSlug) updates.goldClubSlug = "";
  if (current.maroonClubSlug === clubSlug) updates.maroonClubSlug = "";
  if (!updates.goldClubSlug && !updates.maroonClubSlug) return;
  await setDoc(
    ref,
    {
      ...updates,
      updatedAt: serverTimestamp(),
      choicesUpdatedAt: current.choicesUpdatedAt,
    },
    { merge: true },
  );
}
