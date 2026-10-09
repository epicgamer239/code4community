import { FieldValue } from "firebase-admin/firestore";
import {
  CLUB_HUB_MEETING_CHOICES,
  meetingChoicesAfterLeavingClub,
  normalizeMeetingChoices,
  reconcileMeetingChoicesWithMemberships,
} from "@/lib/club-hub/clubMeetingChoices";
import {
  CLUB_HUB_MEMBERSHIPS,
  normalizeClubMembership,
} from "@/lib/club-hub/clubMemberships";

/**
 * Clear Gold/Maroon meeting picks for a club the user left (Admin SDK).
 * Does not apply switch cooldown — leaving a club is not a voluntary switch.
 *
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {string} userId
 * @param {string} clubSlug
 */
export async function clearMeetingChoiceForClubAdmin(db, userId, clubSlug) {
  const uid = userId?.trim();
  const slug = clubSlug?.trim();
  if (!db || !uid || !slug) {
    return {
      changed: false,
      choices: { goldClubSlug: "", maroonClubSlug: "" },
    };
  }

  const ref = db.collection(CLUB_HUB_MEETING_CHOICES).doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    return {
      changed: false,
      choices: normalizeMeetingChoices(null),
    };
  }

  const current = normalizeMeetingChoices(snap.data());
  const next = meetingChoicesAfterLeavingClub(current, slug);

  if (!next.changed) {
    return { changed: false, choices: { goldClubSlug: next.goldClubSlug, maroonClubSlug: next.maroonClubSlug } };
  }

  await ref.set(
    {
      goldClubSlug: next.goldClubSlug,
      maroonClubSlug: next.maroonClubSlug,
      updatedAt: FieldValue.serverTimestamp(),
      choicesUpdatedAt: current.choicesUpdatedAt ?? FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return {
    changed: true,
    choices: { goldClubSlug: next.goldClubSlug, maroonClubSlug: next.maroonClubSlug },
  };
}

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {string} userId
 */
export async function reconcileMeetingChoicesForUserAdmin(db, userId) {
  const uid = userId?.trim();
  if (!db || !uid) {
    return { changed: false, choices: { goldClubSlug: "", maroonClubSlug: "" } };
  }

  const memSnap = await db.collection(CLUB_HUB_MEMBERSHIPS).where("userId", "==", uid).get();
  const memberships = memSnap.docs
    .map((d) => normalizeClubMembership({ ...d.data(), id: d.id }))
    .filter(Boolean);

  const ref = db.collection(CLUB_HUB_MEETING_CHOICES).doc(uid);
  const snap = await ref.get();
  const current = snap.exists
    ? normalizeMeetingChoices(snap.data())
    : { goldClubSlug: "", maroonClubSlug: "", choicesUpdatedAt: null };

  const next = reconcileMeetingChoicesWithMemberships(current, memberships);
  if (!next.changed) {
    return {
      changed: false,
      choices: { goldClubSlug: next.goldClubSlug, maroonClubSlug: next.maroonClubSlug },
    };
  }

  await ref.set(
    {
      goldClubSlug: next.goldClubSlug,
      maroonClubSlug: next.maroonClubSlug,
      updatedAt: FieldValue.serverTimestamp(),
      choicesUpdatedAt: current.choicesUpdatedAt ?? FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return {
    changed: true,
    choices: { goldClubSlug: next.goldClubSlug, maroonClubSlug: next.maroonClubSlug },
  };
}

/**
 * Seminar signup cleanup after club removal (Firestore + returns final choices for sheet sync).
 *
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {{ userId: string, clubSlug: string }} args
 */
export async function clearSeminarSignupAfterClubLeaveAdmin(db, { userId, clubSlug }) {
  await clearMeetingChoiceForClubAdmin(db, userId, clubSlug);
  return reconcileMeetingChoicesForUserAdmin(db, userId);
}
