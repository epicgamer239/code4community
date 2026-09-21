import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  CLUB_HUB_ACCESS_COLLECTION,
  clubHubAccessDocId,
  clubSlugsToMap,
  getSponsorClubSlugsForEmail,
} from "@/lib/club-hub/access";
import {
  CLUB_HUB_SPONSORS_COLLECTION,
  normalizeSponsorList,
} from "@/lib/club-hub/clubSponsors";
import { normalizeEmail } from "@/lib/email";
import { FieldValue } from "firebase-admin/firestore";

/** @returns {Promise<Record<string, { name: string, email: string }[]>>} */
export async function loadClubSponsorOverrides(db) {
  const sponsorSnap = await db.collection(CLUB_HUB_SPONSORS_COLLECTION).get();
  /** @type {Record<string, { name: string, email: string }[]>} */
  const overridesBySlug = {};
  for (const docSnap of sponsorSnap.docs) {
    overridesBySlug[docSnap.id] = normalizeSponsorList(docSnap.data()?.sponsors);
  }
  return overridesBySlug;
}

/**
 * Write directoryClubSlugs for one email from current sponsor overrides.
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {{ email: string, uid: string, overridesBySlug?: Record<string, { name: string, email: string }[]> }} args
 */
export async function syncDirectoryClubSlugsForEmail(db, { email, uid, overridesBySlug = null }) {
  const normalized = normalizeEmail(email);
  if (!normalized || !uid) {
    throw new Error("Missing email or uid.");
  }

  const overrides = overridesBySlug ?? (await loadClubSponsorOverrides(db));
  const directoryClubSlugs = clubSlugsToMap(getSponsorClubSlugsForEmail(normalized, overrides));
  const docId = clubHubAccessDocId(normalized);
  const ref = db.collection(CLUB_HUB_ACCESS_COLLECTION).doc(docId);
  const existing = await ref.get();
  const existingData = existing.exists ? existing.data() : {};

  await ref.set(
    {
      email: normalized,
      directoryClubSlugs,
      isCoordinator: existingData.isCoordinator === true,
      manualClubSlugs: existingData.manualClubSlugs || {},
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: uid,
    },
    { merge: true },
  );

  return { email: normalized, directoryClubSlugs };
}

/**
 * Refresh sponsor access for every email assigned to a club slug.
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {{ slug: string, adminUid: string }} args
 */
export async function refreshSponsorAccessForClubSlug(db, { slug, adminUid }) {
  const overrides = await loadClubSponsorOverrides(db);
  const sponsors = overrides[slug] || [];
  const emails = [...new Set(sponsors.map((s) => normalizeEmail(s.email)).filter(Boolean))];
  const results = [];
  for (const email of emails) {
    results.push(await syncDirectoryClubSlugsForEmail(db, { email, uid: adminUid, overridesBySlug: overrides }));
  }
  return results;
}

/** @param {string} token */
export async function syncSponsorAccessForAuthToken(token) {
  const db = getAdminFirestore();
  if (!db) {
    throw new Error("Server Firebase is not configured.");
  }

  const { getAuth } = await import("firebase-admin/auth");
  const decoded = await getAuth().verifyIdToken(token);
  const email = normalizeEmail(decoded.email);
  const uid = decoded.uid;
  if (!email || !uid) {
    throw new Error("Invalid auth token.");
  }

  return syncDirectoryClubSlugsForEmail(db, { email, uid });
}
