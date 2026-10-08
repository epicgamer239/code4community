import { FieldValue } from "firebase-admin/firestore";
import { normalizeEmail, isValidEmail } from "@/lib/email";
import { getClubBySlug } from "@/lib/club-hub/broadRunClubDirectory";
import {
  CLUB_MEMBER_GROUP_BOARD,
  clubHasBoardMemberGroup,
} from "@/lib/club-hub/clubBoardGroups";
import {
  clubMembershipDocId,
  normalizeClubMembership,
} from "@/lib/club-hub/clubMemberships";
import { setBoardClubSlugGrant } from "@/lib/club-hub/clubHubRolesServer";
import { CLUB_HUB_MEMBERSHIP_COUNTS } from "@/lib/club-hub/clubMembershipCounts";

export const CLUB_HUB_BOARD_MEMBERS = "clubHubBoardMembers";
export const CLUB_HUB_BOARD_MEMBERS_BY_EMAIL = "clubHubBoardMembersByEmail";

const MAX_BOARD_MEMBERS_PER_CLUB = 40;

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {string} clubSlug
 */
export async function fetchBoardMembersForClub(db, clubSlug) {
  const snap = await db.collection(CLUB_HUB_BOARD_MEMBERS).doc(clubSlug).get();
  if (!snap.exists) return [];
  const members = snap.data()?.members;
  if (!Array.isArray(members)) return [];
  return members
    .map((m) => ({
      email: normalizeEmail(m.email) || "",
      displayName: typeof m.displayName === "string" ? m.displayName.trim().slice(0, 100) : "",
      uid: typeof m.uid === "string" ? m.uid : "",
      addedAt: m.addedAt || null,
    }))
    .filter((m) => m.email);
}

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {string} normalizedEmail
 */
async function addEmailBoardIndex(db, normalizedEmail, clubSlug) {
  const ref = db.collection(CLUB_HUB_BOARD_MEMBERS_BY_EMAIL).doc(normalizedEmail);
  const snap = await ref.get();
  const clubSlugs = { ...(snap.data()?.clubSlugs || {}), [clubSlug]: true };
  await ref.set(
    {
      email: normalizedEmail,
      clubSlugs,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {string} normalizedEmail
 * @param {string} clubSlug
 */
async function removeEmailBoardIndex(db, normalizedEmail, clubSlug) {
  const ref = db.collection(CLUB_HUB_BOARD_MEMBERS_BY_EMAIL).doc(normalizedEmail);
  const snap = await ref.get();
  if (!snap.exists) return;
  const clubSlugs = { ...(snap.data()?.clubSlugs || {}) };
  delete clubSlugs[clubSlug];
  if (Object.keys(clubSlugs).length === 0) {
    await ref.delete();
    return;
  }
  await ref.set(
    {
      email: normalizedEmail,
      clubSlugs,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {{ clubSlug: string, uid: string, email: string, displayName: string, clubName: string }} args
 */
async function ensureBoardMembership(db, args) {
  const { clubSlug, uid, email, displayName, clubName } = args;
  if (!clubHasBoardMemberGroup(clubSlug)) return;

  const membershipRef = db
    .collection("clubHubMemberships")
    .doc(clubMembershipDocId(clubSlug, uid));
  const snap = await membershipRef.get();

  if (!snap.exists) {
    await membershipRef.set({
      clubSlug,
      clubName,
      userId: uid,
      userEmail: email,
      displayName: displayName.slice(0, 100) || "Member",
      memberGroups: [CLUB_MEMBER_GROUP_BOARD],
      joinedAt: FieldValue.serverTimestamp(),
    });
    await db
      .collection(CLUB_HUB_MEMBERSHIP_COUNTS)
      .doc(clubSlug)
      .set(
        {
          clubSlug,
          clubName,
          memberCount: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    return;
  }

  const row = normalizeClubMembership({ ...snap.data(), id: snap.id });
  if (!row) return;
  /** @type {string[]} */
  const groups = Array.isArray(snap.data()?.memberGroups)
    ? snap.data().memberGroups.filter((g) => typeof g === "string")
    : [];
  if (!groups.includes(CLUB_MEMBER_GROUP_BOARD)) {
    groups.push(CLUB_MEMBER_GROUP_BOARD);
    await membershipRef.update({ memberGroups: groups.slice(0, 8) });
  }
}

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {{ clubSlug: string, memberEmail: string, actorUid: string, displayName?: string }} args
 */
export async function addBoardMemberForClub(db, args) {
  const clubSlug = args.clubSlug?.trim();
  const memberEmail = normalizeEmail(args.memberEmail);
  if (!clubSlug) throw new Error("Missing club.");
  if (!isValidEmail(memberEmail)) throw new Error("Enter a valid email.");

  const club = getClubBySlug(clubSlug);
  if (!club) throw new Error("Unknown club.");

  const existing = await fetchBoardMembersForClub(db, clubSlug);
  if (existing.some((m) => m.email === memberEmail)) {
    throw new Error("That email is already on the board list.");
  }
  if (existing.length >= MAX_BOARD_MEMBERS_PER_CLUB) {
    throw new Error(`Board list is full (max ${MAX_BOARD_MEMBERS_PER_CLUB}).`);
  }

  const { getAuth } = await import("firebase-admin/auth");
  let memberUid = "";
  let memberDisplayName = args.displayName?.trim().slice(0, 100) || "";
  try {
    const userRecord = await getAuth().getUserByEmail(memberEmail);
    memberUid = userRecord.uid;
    memberDisplayName =
      memberDisplayName ||
      userRecord.displayName?.trim().slice(0, 100) ||
      memberEmail.split("@")[0];
  } catch {
    memberDisplayName = memberDisplayName || memberEmail.split("@")[0];
  }

  const memberEntry = {
    email: memberEmail,
    displayName: memberDisplayName,
    uid: memberUid,
    addedAt: FieldValue.serverTimestamp(),
    addedBy: args.actorUid,
  };

  const clubRef = db.collection(CLUB_HUB_BOARD_MEMBERS).doc(clubSlug);
  const clubSnap = await clubRef.get();
  const members = clubSnap.exists && Array.isArray(clubSnap.data()?.members)
    ? [...clubSnap.data().members, memberEntry]
    : [memberEntry];

  await clubRef.set(
    {
      clubSlug,
      clubName: club.name,
      members,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: args.actorUid,
    },
    { merge: true },
  );

  await addEmailBoardIndex(db, memberEmail, clubSlug);
  await setBoardClubSlugGrant(db, memberEmail, clubSlug, true, args.actorUid);

  if (memberUid) {
    await ensureBoardMembership(db, {
      clubSlug,
      uid: memberUid,
      email: memberEmail,
      displayName: memberDisplayName,
      clubName: club.name,
    });
  }

  return { email: memberEmail, uid: memberUid, pendingSignup: !memberUid };
}

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {{ clubSlug: string, memberEmail: string, actorUid: string }} args
 */
export async function removeBoardMemberForClub(db, args) {
  const clubSlug = args.clubSlug?.trim();
  const memberEmail = normalizeEmail(args.memberEmail);
  if (!clubSlug || !memberEmail) throw new Error("Missing club or email.");

  const clubRef = db.collection(CLUB_HUB_BOARD_MEMBERS).doc(clubSlug);
  const clubSnap = await clubRef.get();
  if (!clubSnap.exists) throw new Error("Board member not found.");

  const members = Array.isArray(clubSnap.data()?.members) ? clubSnap.data().members : [];
  const next = members.filter((m) => normalizeEmail(m.email) !== memberEmail);
  if (next.length === members.length) throw new Error("Board member not found.");

  if (next.length === 0) {
    await clubRef.delete();
  } else {
    await clubRef.set(
      {
        clubSlug,
        clubName: clubSnap.data()?.clubName || clubSlug,
        members: next,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: args.actorUid,
      },
      { merge: true },
    );
  }

  await removeEmailBoardIndex(db, memberEmail, clubSlug);
  await setBoardClubSlugGrant(db, memberEmail, clubSlug, false, args.actorUid);

  const removed = members.find((m) => normalizeEmail(m.email) === memberEmail);
  const uid = typeof removed?.uid === "string" ? removed.uid : "";
  if (uid && clubHasBoardMemberGroup(clubSlug)) {
    const membershipRef = db.collection("clubHubMemberships").doc(clubMembershipDocId(clubSlug, uid));
    const memSnap = await membershipRef.get();
    if (memSnap.exists) {
      const groups = Array.isArray(memSnap.data()?.memberGroups)
        ? memSnap.data().memberGroups.filter((g) => g !== CLUB_MEMBER_GROUP_BOARD)
        : [];
      await membershipRef.update({ memberGroups: groups });
    }
  }

  return { email: memberEmail };
}

/**
 * After login — apply board roster membership for clubs indexed by email.
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {{ email: string, uid: string, displayName?: string }} user
 */
export async function syncBoardMemberMembershipsForUser(db, user) {
  const email = normalizeEmail(user.email);
  if (!email || !user.uid) return { synced: [] };

  const indexSnap = await db.collection(CLUB_HUB_BOARD_MEMBERS_BY_EMAIL).doc(email).get();
  if (!indexSnap.exists) return { synced: [] };

  const clubSlugs = indexSnap.data()?.clubSlugs;
  if (!clubSlugs || typeof clubSlugs !== "object") return { synced: [] };

  /** @type {string[]} */
  const synced = [];
  for (const clubSlug of Object.keys(clubSlugs)) {
    if (!clubSlugs[clubSlug]) continue;
    const club = getClubBySlug(clubSlug);
    if (!club) continue;
    await ensureBoardMembership(db, {
      clubSlug,
      uid: user.uid,
      email,
      displayName: user.displayName?.trim() || email.split("@")[0],
      clubName: club.name,
    });
    synced.push(clubSlug);

    const clubRef = db.collection(CLUB_HUB_BOARD_MEMBERS).doc(clubSlug);
    const clubSnap = await clubRef.get();
    if (!clubSnap.exists) continue;
    const members = Array.isArray(clubSnap.data()?.members) ? clubSnap.data().members : [];
    let changed = false;
    const updated = members.map((m) => {
      if (normalizeEmail(m.email) !== email) return m;
      if (m.uid === user.uid) return m;
      changed = true;
      return { ...m, uid: user.uid };
    });
    if (changed) {
      await clubRef.update({ members: updated, updatedAt: FieldValue.serverTimestamp() });
    }
  }

  return { synced };
}
