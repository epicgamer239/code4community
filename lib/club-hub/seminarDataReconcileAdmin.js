import { FieldValue } from "firebase-admin/firestore";
import { applyCustomClubsFromAdminDb } from "@/lib/club-hub/customClubsServer";
import { applyMeetingDayOverridesFromAdminDb } from "@/lib/club-hub/clubMeetingDaysServer";
import {
  CLUB_HUB_MEMBERSHIPS,
  normalizeClubMembership,
} from "@/lib/club-hub/clubMemberships";
import { CLUB_HUB_MEMBERSHIP_COUNTS } from "@/lib/club-hub/clubMembershipCounts";
import {
  resolveSeminarDays,
  seminarSlotsForMembership,
} from "@/lib/club-hub/seminarMembershipLimit";

/** @param {unknown} raw */
function joinedAtMillis(raw) {
  if (!raw) return Number.MAX_SAFE_INTEGER;
  if (typeof raw.toMillis === "function") return raw.toMillis();
  if (typeof raw.seconds === "number") return raw.seconds * 1000;
  const t = Date.parse(String(raw));
  return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
}

/**
 * Keep at most one Gold and one Maroon seminar membership per user (earliest join wins).
 * Dual-day memberships that fill both slots are kept as a single row.
 *
 * @param {NonNullable<ReturnType<typeof normalizeClubMembership>>[]} memberships
 */
export function planSeminarMembershipTrim(memberships) {
  /** @type {{ membership: NonNullable<ReturnType<typeof normalizeClubMembership>>, slots: { gold: boolean, maroon: boolean }, days: ("gold"|"maroon")[] }[]} */
  const ranked = memberships
    .map((membership) => {
      const days = resolveSeminarDays(membership);
      const slots = seminarSlotsForMembership(membership);
      return { membership, slots, days };
    })
    .filter((row) => row.slots.gold || row.slots.maroon)
    .sort(
      (a, b) =>
        joinedAtMillis(a.membership.joinedAt) - joinedAtMillis(b.membership.joinedAt) ||
        a.membership.clubSlug.localeCompare(b.membership.clubSlug),
    );

  let goldTaken = false;
  let maroonTaken = false;
  /** @type {typeof ranked} */
  const keep = [];
  /** @type {typeof ranked} */
  const remove = [];

  for (const row of ranked) {
    const needsGold = row.slots.gold;
    const needsMaroon = row.slots.maroon;
    const goldOk = !needsGold || !goldTaken;
    const maroonOk = !needsMaroon || !maroonTaken;
    if (goldOk && maroonOk) {
      keep.push(row);
      if (needsGold) goldTaken = true;
      if (needsMaroon) maroonTaken = true;
      continue;
    }
    remove.push(row);
  }

  return { keep, remove };
}

/**
 * Align memberships (≤1 gold + ≤1 maroon) and explicit seminarDays.
 * Gold/Maroon for sheets/UI are derived from memberships — no choices collection.
 *
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {{ dryRun?: boolean }} [opts]
 */
export async function reconcileAllSeminarDataAdmin(db, opts = {}) {
  const dryRun = Boolean(opts.dryRun);
  await applyCustomClubsFromAdminDb(db);
  await applyMeetingDayOverridesFromAdminDb(db);

  const memSnap = await db.collection(CLUB_HUB_MEMBERSHIPS).get();

  /** @type {Map<string, NonNullable<ReturnType<typeof normalizeClubMembership>>[]>} */
  const byUser = new Map();
  for (const doc of memSnap.docs) {
    const membership = normalizeClubMembership({ ...doc.data(), id: doc.id }, doc.id);
    if (!membership) continue;
    const list = byUser.get(membership.userId) || [];
    list.push(membership);
    byUser.set(membership.userId, list);
  }

  /** @type {object[]} */
  const membershipDeletes = [];
  /** @type {object[]} */
  const seminarDayUpdates = [];
  /** @type {Map<string, { clubSlug: string, clubName: string, delta: number }>} */
  const countDeltas = new Map();

  for (const [userId, memberships] of byUser) {
    const { keep, remove } = planSeminarMembershipTrim(memberships);

    for (const row of remove) {
      membershipDeletes.push({
        userId,
        id: row.membership.id,
        clubSlug: row.membership.clubSlug,
        clubName: row.membership.clubName || row.membership.clubSlug,
        days: row.days,
      });
      const key = row.membership.clubSlug;
      const prev = countDeltas.get(key) || {
        clubSlug: key,
        clubName: row.membership.clubName || key,
        delta: 0,
      };
      prev.delta -= 1;
      countDeltas.set(key, prev);
    }

    for (const membership of memberships) {
      if (remove.some((row) => row.membership.id === membership.id)) continue;
      const kept = keep.find((row) => row.membership.id === membership.id);
      if (!kept) continue;
      const nextDays = kept.days;
      const prevDays = membership.seminarDays;
      const same =
        Array.isArray(prevDays) &&
        prevDays.length === nextDays.length &&
        nextDays.every((day) => prevDays.includes(day));
      if (!same) {
        seminarDayUpdates.push({
          userId,
          id: membership.id,
          clubSlug: membership.clubSlug,
          from: prevDays,
          to: nextDays,
        });
      }
    }
  }

  if (!dryRun) {
    for (let i = 0; i < membershipDeletes.length; i += 400) {
      const chunk = membershipDeletes.slice(i, i + 400);
      const batch = db.batch();
      for (const row of chunk) {
        batch.delete(db.collection(CLUB_HUB_MEMBERSHIPS).doc(row.id));
      }
      await batch.commit();
    }

    for (const [, delta] of countDeltas) {
      if (!delta.delta) continue;
      await db
        .collection(CLUB_HUB_MEMBERSHIP_COUNTS)
        .doc(delta.clubSlug)
        .set(
          {
            clubSlug: delta.clubSlug,
            clubName: delta.clubName,
            memberCount: FieldValue.increment(delta.delta),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
    }

    for (let i = 0; i < seminarDayUpdates.length; i += 400) {
      const chunk = seminarDayUpdates.slice(i, i + 400);
      const batch = db.batch();
      for (const row of chunk) {
        batch.set(
          db.collection(CLUB_HUB_MEMBERSHIPS).doc(row.id),
          {
            seminarDays: row.to,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
      await batch.commit();
    }
  }

  return {
    ok: true,
    dryRun,
    users: byUser.size,
    membershipDeletes: membershipDeletes.length,
    seminarDayUpdates: seminarDayUpdates.length,
    choiceWrites: 0,
    sampleDeletes: membershipDeletes.slice(0, 20),
    sampleChoiceWrites: [],
  };
}
