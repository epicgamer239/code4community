import { FieldValue } from "firebase-admin/firestore";
import { normalizeEmail } from "@/lib/email";
import { lookupBroadRunName, BROAD_RUN_EMAIL_TO_NAME } from "@/lib/club-hub/broadRunRoster";
import { searchBroadRunRoster } from "@/lib/club-hub/broadRunRosterSearch";
import {
  CLUB_HUB_MEETING_CHOICES,
  normalizeMeetingChoices,
  validateMeetingChoices,
} from "@/lib/club-hub/clubMeetingChoices";
import {
  CLUB_HUB_MEMBERSHIPS,
  normalizeClubMembership,
} from "@/lib/club-hub/clubMemberships";
import { CLUB_HUB_SPECIAL_SHEET_EVENTS } from "@/lib/club-hub/specialSheetEvents";
import { listSpecialSheetEvents } from "@/lib/club-hub/specialSheetEventsServer";
import { syncStudentMeetingRowToSheet } from "@/lib/club-hub/meetingChoicesSheetSync";
import { syncSpecialSheetEventsToStudentMeetingTab } from "@/lib/club-hub/specialSheetEventsSheetSync";

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {string} email
 */
async function resolveUserIdForEmail(db, email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const snap = await db.collection("users").where("email", "==", normalized).limit(1).get();
  if (!snap.empty) return snap.docs[0].id;

  const { getAuth } = await import("firebase-admin/auth");
  try {
    const user = await getAuth().getUserByEmail(normalized);
    return user.uid;
  } catch {
    return null;
  }
}

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {string} query
 */
export async function searchStudentsForAdmin(db, query) {
  const rosterHits = searchBroadRunRoster(query, 12);
  /** @type {Map<string, { email: string, displayName: string, userId: string | null }>} */
  const byEmail = new Map();

  for (const hit of rosterHits) {
    byEmail.set(hit.email, { ...hit, userId: null });
  }

  const q = query.trim().toLowerCase();
  if (q.includes("@") && q.length >= 3) {
    const prefixSnap = await db
      .collection("users")
      .where("email", ">=", q)
      .where("email", "<=", `${q}\uf8ff`)
      .limit(8)
      .get();
    for (const docSnap of prefixSnap.docs) {
      const email = normalizeEmail(docSnap.data()?.email) || "";
      if (!email) continue;
      const displayName =
        docSnap.data()?.displayName?.trim() ||
        lookupBroadRunName(email) ||
        BROAD_RUN_EMAIL_TO_NAME[email] ||
        email.split("@")[0];
      byEmail.set(email, { email, displayName, userId: docSnap.id });
    }
  }

  const enriched = await Promise.all(
    [...byEmail.values()].slice(0, 12).map(async (row) => {
      if (row.userId) return row;
      const userId = await resolveUserIdForEmail(db, row.email);
      return { ...row, userId };
    }),
  );

  return enriched.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {string} userId
 */
export async function getStudentHubProfileForAdmin(db, userId) {
  const uid = userId?.trim();
  if (!uid) throw new Error("Missing student.");

  const userSnap = await db.collection("users").doc(uid).get();
  let email = "";
  let displayName = "Student";
  if (userSnap.exists) {
    email = normalizeEmail(userSnap.data()?.email) || "";
    displayName =
      userSnap.data()?.displayName?.trim() || lookupBroadRunName(email) || displayName;
  } else {
    const { getAuth } = await import("firebase-admin/auth");
    try {
      const authUser = await getAuth().getUser(uid);
      email = normalizeEmail(authUser.email) || "";
      displayName =
        authUser.displayName?.trim() || lookupBroadRunName(email) || email.split("@")[0] || displayName;
    } catch {
      throw new Error("Student account not found.");
    }
  }

  const membershipSnap = await db
    .collection(CLUB_HUB_MEMBERSHIPS)
    .where("userId", "==", uid)
    .get();
  const memberships = membershipSnap.docs
    .map((d) => normalizeClubMembership({ ...d.data(), id: d.id }))
    .filter(Boolean)
    .sort((a, b) => (a.clubName || a.clubSlug).localeCompare(b.clubName || b.clubSlug));

  const choiceSnap = await db.collection(CLUB_HUB_MEETING_CHOICES).doc(uid).get();
  const meetingChoices = choiceSnap.exists
    ? normalizeMeetingChoices(choiceSnap.data())
    : { goldClubSlug: "", maroonClubSlug: "", choicesUpdatedAt: null };

  const events = await listSpecialSheetEvents(db);
  const specialEvents = events.map((ev) => {
    const studentUserIds = Array.isArray(ev.studentUserIds) ? ev.studentUserIds : [];
    return {
      id: ev.id,
      title: ev.title,
      meetingSlot: ev.meetingSlot,
      columnLabel: ev.columnLabel,
      enrolled: studentUserIds.includes(uid),
    };
  });

  return {
    userId: uid,
    email,
    displayName,
    memberships,
    meetingChoices,
    specialEvents,
  };
}

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {{ userId: string, goldClubSlug: string, maroonClubSlug: string }} args
 */
export async function adminSetStudentMeetingChoices(db, args) {
  const uid = args.userId?.trim();
  if (!uid) throw new Error("Missing student.");

  const membershipSnap = await db
    .collection(CLUB_HUB_MEMBERSHIPS)
    .where("userId", "==", uid)
    .get();
  const memberships = membershipSnap.docs
    .map((d) => normalizeClubMembership({ ...d.data(), id: d.id }))
    .filter(Boolean);
  const joinedSlugs = new Set(memberships.map((m) => m.clubSlug));

  const choices = normalizeMeetingChoices({
    goldClubSlug: args.goldClubSlug,
    maroonClubSlug: args.maroonClubSlug,
  });
  const err = validateMeetingChoices(choices, joinedSlugs, memberships);
  if (err) throw new Error(err);

  await db
    .collection(CLUB_HUB_MEETING_CHOICES)
    .doc(uid)
    .set(
      {
        goldClubSlug: choices.goldClubSlug,
        maroonClubSlug: choices.maroonClubSlug,
        updatedAt: FieldValue.serverTimestamp(),
        choicesUpdatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  const profile = await db.collection("users").doc(uid).get();
  let displayName = profile.data()?.displayName?.trim() || "Student";
  const email = normalizeEmail(profile.data()?.email);
  if (!displayName && email) {
    displayName = lookupBroadRunName(email) || email.split("@")[0];
  }

  await syncStudentMeetingRowToSheet({
    userId: uid,
    displayName,
    goldClubSlug: choices.goldClubSlug,
    maroonClubSlug: choices.maroonClubSlug,
  });

  return choices;
}

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {{ eventId: string, userId: string, enrolled: boolean }} args
 */
export async function adminSetStudentSpecialEventEnrollment(db, args) {
  const eventId = args.eventId?.trim();
  const uid = args.userId?.trim();
  if (!eventId || !uid) throw new Error("Missing event or student.");

  const ref = db.collection(CLUB_HUB_SPECIAL_SHEET_EVENTS).doc(eventId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Special event not found.");

  const data = snap.data() || {};
  /** @type {string[]} */
  let studentUserIds = Array.isArray(data.studentUserIds)
    ? data.studentUserIds.filter((id) => typeof id === "string")
    : [];
  /** @type {string[]} */
  let studentEmails = Array.isArray(data.studentEmails)
    ? data.studentEmails.map((e) => normalizeEmail(e)).filter(Boolean)
    : [];

  const userSnap = await db.collection("users").doc(uid).get();
  const studentEmail = normalizeEmail(userSnap.data()?.email);

  if (args.enrolled) {
    if (!studentUserIds.includes(uid)) studentUserIds.push(uid);
    if (studentEmail && !studentEmails.includes(studentEmail)) studentEmails.push(studentEmail);
  } else {
    studentUserIds = studentUserIds.filter((id) => id !== uid);
    if (studentEmail) studentEmails = studentEmails.filter((e) => e !== studentEmail);
  }

  await ref.update({
    studentUserIds,
    studentEmails,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await syncSpecialSheetEventsToStudentMeetingTab();
  return { enrolled: args.enrolled };
}
