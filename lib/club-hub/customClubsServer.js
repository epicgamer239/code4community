import { FieldValue } from "firebase-admin/firestore";
import { normalizeEmail } from "@/lib/email";
import { BROAD_RUN_CLUBS, clubNameToSlug } from "@/lib/club-hub/broadRunClubDirectory";
import { normalizeClubMeetingDay } from "@/lib/club-hub/clubDirectorySections";
import { CLUB_HUB_EVENTS } from "@/lib/club-hub/clubEvents";
import { CLUB_HUB_MEMBERSHIP_COUNTS } from "@/lib/club-hub/clubMembershipCounts";
import { CLUB_HUB_MEMBERSHIPS } from "@/lib/club-hub/clubMemberships";
import { CLUB_HUB_PAGES } from "@/lib/club-hub/clubPages";
import { CLUB_HUB_SPONSORS_COLLECTION } from "@/lib/club-hub/clubSponsors";
import { CLUB_HUB_JOIN_REQUESTS } from "@/lib/club-hub/joinRequests";
import {
  CLUB_HUB_BOARD_MEMBERS,
  CLUB_HUB_BOARD_MEMBERS_BY_EMAIL,
} from "@/lib/club-hub/boardMembersServer";
import { setClubMeetingDayAndClearSignups } from "@/lib/club-hub/clubMeetingDaysServer";
import {
  listMemberUserIdsForClubAdmin,
  loadMembershipsForUserAdmin,
} from "@/lib/club-hub/meetingChoicesFromMembershipsAdmin";
import { meetingChoicesFromMemberships } from "@/lib/club-hub/seminarMembershipLimit";
import {
  clubDeleteConfirmationPhrase,
  normalizeCustomClub,
  normalizeCustomClubSponsors,
  setCustomClubs,
} from "@/lib/club-hub/customClubStore";
import { setRemovedClubSlugs } from "@/lib/club-hub/removedClubsStore";

export const CLUB_HUB_CUSTOM_CLUBS = "clubHubCustomClubs";
export const CLUB_HUB_REMOVED_CLUBS = "clubHubRemovedClubs";
const CLUB_HUB_MEETING_DAYS = "clubHubMeetingDays";

/** @param {import("firebase-admin/firestore").Firestore} db @param {FirebaseFirestore.QueryDocumentSnapshot[]} docs */
async function deleteQueryDocs(db, docs) {
  for (let i = 0; i < docs.length; i += 400) {
    const chunk = docs.slice(i, i + 400);
    const batch = db.batch();
    for (const docSnap of chunk) batch.delete(docSnap.ref);
    await batch.commit();
  }
}

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 */
export async function applyRemovedClubsFromAdminDb(db) {
  if (!db) return;
  const snap = await db.collection(CLUB_HUB_REMOVED_CLUBS).get();
  setRemovedClubSlugs(snap.docs.map((docSnap) => docSnap.id));
}

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 */
export async function applyCustomClubsFromAdminDb(db) {
  if (!db) return;
  const [customSnap] = await Promise.all([
    db.collection(CLUB_HUB_CUSTOM_CLUBS).get(),
    applyRemovedClubsFromAdminDb(db),
  ]);
  setCustomClubs(customSnap.docs.map((docSnap) => ({ ...docSnap.data(), slug: docSnap.id })));
}

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {{ name: string, meetingDay: string, sponsors: { name: string, email: string }[], adminUid: string }} args
 */
export async function createCustomClub(db, args) {
  const name = String(args.name || "").trim().slice(0, 120);
  const adminUid = args.adminUid?.trim() || "";
  const meetingDay = normalizeClubMeetingDay(args.meetingDay);
  const sponsors = normalizeCustomClubSponsors(args.sponsors);
  if (!name) throw new Error("Enter a club name.");
  if (!adminUid) throw new Error("Not signed in.");
  if (!meetingDay) throw new Error("Pick Gold, Maroon, Gold & Maroon, or General.");
  if (sponsors.length === 0) throw new Error("Add at least one sponsor name and email.");

  const slug = clubNameToSlug(name);
  if (!slug || slug.length > 120) throw new Error("That club name cannot be used.");
  if (BROAD_RUN_CLUBS.some((club) => clubNameToSlug(club.name) === slug)) {
    throw new Error("A club with that name already exists.");
  }

  const ref = db.collection(CLUB_HUB_CUSTOM_CLUBS).doc(slug);
  const existing = await ref.get();
  if (existing.exists) throw new Error("A club with that name already exists.");

  const club = normalizeCustomClub({ slug, name, sponsors, meetingDay }, slug);
  if (!club) throw new Error("Enter the club name, meeting day, and a sponsor.");

  await ref.set({
    slug: club.slug,
    name: club.name,
    sponsors: club.sponsors,
    meetingDay: club.meetingDay,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: adminUid,
  });

  await setClubMeetingDayAndClearSignups(db, {
    slug: club.slug,
    clubName: club.name,
    meetingDay: club.meetingDay,
    adminUid,
  });

  await applyCustomClubsFromAdminDb(db);
  return club;
}

/**
 * Delete a club (custom or directory) and related Club Hub data.
 * Directory clubs are soft-removed so they leave the Hub without editing source.
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {{ slug: string, confirmation: string, adminUid: string }} args
 */
export async function deleteCustomClub(db, args) {
  const slug = String(args.slug || "").trim();
  const adminUid = args.adminUid?.trim() || "";
  const confirmation = String(args.confirmation || "").trim();
  if (!slug) throw new Error("Missing club.");
  if (!adminUid) throw new Error("Not signed in.");

  const customRef = db.collection(CLUB_HUB_CUSTOM_CLUBS).doc(slug);
  const removedRef = db.collection(CLUB_HUB_REMOVED_CLUBS).doc(slug);
  const [customSnap, removedSnap] = await Promise.all([customRef.get(), removedRef.get()]);
  if (removedSnap.exists) throw new Error("That club is already deleted.");

  /** @type {{ slug: string, name: string }} */
  let club;
  const isCustom = customSnap.exists;
  if (isCustom) {
    const normalized = normalizeCustomClub({ ...customSnap.data(), slug }, slug);
    if (!normalized) throw new Error("That club record is incomplete.");
    club = { slug: normalized.slug, name: normalized.name };
  } else {
    const directoryClub = BROAD_RUN_CLUBS.find((entry) => clubNameToSlug(entry.name) === slug);
    if (!directoryClub) throw new Error("Club not found.");
    club = { slug, name: directoryClub.name };
  }

  const expected = clubDeleteConfirmationPhrase(club.name);
  if (confirmation !== expected) {
    throw new Error(`Type exactly: ${expected}`);
  }

  const memberUserIds = await listMemberUserIdsForClubAdmin(db, slug);
  /** @type {{ userId: string, displayName: string, goldClubSlug: string, maroonClubSlug: string }[]} */
  const meetingRows = [];
  for (const userId of memberUserIds) {
    const memberships = await loadMembershipsForUserAdmin(db, userId);
    const remaining = memberships.filter((m) => m.clubSlug !== slug);
    const next = meetingChoicesFromMemberships(remaining);
    meetingRows.push({
      userId,
      displayName: "Student",
      goldClubSlug: next.goldClubSlug,
      maroonClubSlug: next.maroonClubSlug,
    });
  }
  for (let i = 0; i < meetingRows.length; i += 50) {
    const chunk = meetingRows.slice(i, i + 50);
    const profiles = await db.getAll(...chunk.map((row) => db.collection("users").doc(row.userId)));
    chunk.forEach((row, index) => {
      row.displayName = profiles[index]?.data()?.displayName?.trim() || "Student";
    });
  }

  const [memberships, joinRequests, events] = await Promise.all([
    db.collection(CLUB_HUB_MEMBERSHIPS).where("clubSlug", "==", slug).get(),
    db.collection(CLUB_HUB_JOIN_REQUESTS).where("clubSlug", "==", slug).get(),
    db.collection(CLUB_HUB_EVENTS).where("clubSlug", "==", slug).get(),
  ]);
  await deleteQueryDocs(db, memberships.docs);
  await deleteQueryDocs(db, joinRequests.docs);
  await deleteQueryDocs(db, events.docs);

  const boardSnap = await db.collection(CLUB_HUB_BOARD_MEMBERS).doc(slug).get();
  if (boardSnap.exists) {
    const members = Array.isArray(boardSnap.data()?.members) ? boardSnap.data().members : [];
    for (const member of members) {
      const email = normalizeEmail(member?.email);
      if (!email) continue;
      const emailRef = db.collection(CLUB_HUB_BOARD_MEMBERS_BY_EMAIL).doc(email);
      const emailSnap = await emailRef.get();
      if (!emailSnap.exists) continue;
      const clubSlugs = { ...(emailSnap.data()?.clubSlugs || {}) };
      delete clubSlugs[slug];
      if (Object.keys(clubSlugs).length === 0) await emailRef.delete();
      else await emailRef.set({ clubSlugs, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    await boardSnap.ref.delete();
  }

  await Promise.all([
    db.collection(CLUB_HUB_MEETING_DAYS).doc(slug).delete().catch(() => {}),
    db.collection(CLUB_HUB_PAGES).doc(slug).delete().catch(() => {}),
    db.collection(CLUB_HUB_SPONSORS_COLLECTION).doc(slug).delete().catch(() => {}),
    db.collection(CLUB_HUB_MEMBERSHIP_COUNTS).doc(slug).delete().catch(() => {}),
    isCustom
      ? customRef.delete()
      : removedRef.set({
          slug: club.slug,
          name: club.name,
          removedAt: FieldValue.serverTimestamp(),
          removedBy: adminUid,
        }),
  ]);

  await applyCustomClubsFromAdminDb(db);

  return { club, meetingRows };
}
