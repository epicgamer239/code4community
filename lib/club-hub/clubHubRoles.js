import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { firestore } from "@/firebase";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import { normalizeEmail, isValidEmail } from "@/lib/email";
import {
  CLUB_HUB_ACCESS_COLLECTION,
  clubHubAccessDocId,
  clubSlugsToMap,
  isProtectedClubHubCoordinator,
} from "@/lib/club-hub/access";

/**
 * @param {Record<string, unknown> | null | undefined} raw
 */
export function normalizeAccessRecord(raw) {
  if (!raw) return null;
  const email = normalizeEmail(raw.email) || normalizeEmail(raw.id);
  if (!email) return null;

  /** @type {Record<string, boolean>} */
  const manualClubSlugs = {};
  /** @type {Record<string, boolean>} */
  const directoryClubSlugs = {};

  const rawManual = raw.manualClubSlugs ?? raw.clubSlugs;
  if (rawManual && typeof rawManual === "object" && !Array.isArray(rawManual)) {
    for (const [slug, allowed] of Object.entries(rawManual)) {
      if (allowed === true && typeof slug === "string" && slug.trim()) {
        manualClubSlugs[slug.trim()] = true;
      }
    }
  }

  const rawDirectory = raw.directoryClubSlugs;
  if (rawDirectory && typeof rawDirectory === "object" && !Array.isArray(rawDirectory)) {
    for (const [slug, allowed] of Object.entries(rawDirectory)) {
      if (allowed === true && typeof slug === "string" && slug.trim()) {
        directoryClubSlugs[slug.trim()] = true;
      }
    }
  }

  return {
    email,
    isCoordinator: raw.isCoordinator === true,
    manualClubSlugs,
    directoryClubSlugs,
  };
}

/** @param {string | null | undefined} email */
export async function fetchClubHubAccessForEmail(email) {
  if (!firestore) return null;
  const id = clubHubAccessDocId(email);
  if (!id) return null;
  const snap = await getDoc(doc(firestore, CLUB_HUB_ACCESS_COLLECTION, id));
  if (!snap.exists()) return null;
  return normalizeAccessRecord(snap.data());
}

export async function fetchAllClubHubAccessRecords() {
  if (!firestore) return [];
  const snap = await getDocs(collection(firestore, CLUB_HUB_ACCESS_COLLECTION));
  return snap.docs
    .map((d) => normalizeAccessRecord({ ...d.data(), id: d.id }))
    .filter(Boolean);
}

/**
 * @param {{ email: string, adminUid: string, isCoordinator: boolean }} args
 */
export async function setClubHubCoordinator({ email, adminUid, isCoordinator }) {
  if (!firestore) throw new Error("Firebase is not configured.");
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) throw new Error("Enter a valid email.");
  if (isProtectedClubHubCoordinator(normalized) && !isCoordinator) {
    throw new Error("This coordinator cannot be removed.");
  }

  assertClientRateLimit("clubHubPageWrite", adminUid);

  const id = clubHubAccessDocId(normalized);
  const existing = await fetchClubHubAccessForEmail(normalized);
  const manualClubSlugs = existing?.manualClubSlugs || {};
  const directoryClubSlugs = existing?.directoryClubSlugs || {};

  if (
    !isCoordinator &&
    Object.keys(manualClubSlugs).length === 0 &&
    Object.keys(directoryClubSlugs).length === 0
  ) {
    await deleteDoc(doc(firestore, CLUB_HUB_ACCESS_COLLECTION, id));
    return null;
  }

  await setDoc(
    doc(firestore, CLUB_HUB_ACCESS_COLLECTION, id),
    {
      email: normalized,
      isCoordinator,
      manualClubSlugs,
      directoryClubSlugs,
      updatedAt: serverTimestamp(),
      updatedBy: adminUid,
    },
    { merge: true },
  );

  return fetchClubHubAccessForEmail(normalized);
}

/**
 * @param {{ email: string, clubSlugs: string[], adminUid: string }} args
 */
export async function setClubHubManualClubAccess({ email, clubSlugs, adminUid }) {
  if (!firestore) throw new Error("Firebase is not configured.");
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) throw new Error("Enter a valid email.");

  assertClientRateLimit("clubHubPageWrite", adminUid);

  const id = clubHubAccessDocId(normalized);
  const existing = await fetchClubHubAccessForEmail(normalized);
  const isCoordinator = existing?.isCoordinator === true;
  const directoryClubSlugs = existing?.directoryClubSlugs || {};
  const manualClubSlugs = clubSlugsToMap(clubSlugs);

  if (
    !isCoordinator &&
    Object.keys(manualClubSlugs).length === 0 &&
    Object.keys(directoryClubSlugs).length === 0
  ) {
    await deleteDoc(doc(firestore, CLUB_HUB_ACCESS_COLLECTION, id));
    return null;
  }

  await setDoc(
    doc(firestore, CLUB_HUB_ACCESS_COLLECTION, id),
    {
      email: normalized,
      isCoordinator,
      manualClubSlugs,
      directoryClubSlugs,
      updatedAt: serverTimestamp(),
      updatedBy: adminUid,
    },
    { merge: true },
  );

  return fetchClubHubAccessForEmail(normalized);
}

