import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { firestore } from "@/firebase";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import { normalizeEmail, isValidEmail, emailsEqual } from "@/lib/email";
import {
  BROAD_RUN_CLUBS,
  clubNameToSlug,
  getClubBySlug,
} from "@/lib/club-hub/broadRunClubDirectory";

export const CLUB_HUB_SPONSORS_COLLECTION = "clubHubSponsors";

/**
 * @param {unknown} raw
 * @returns {{ name: string, email: string }[]}
 */
export function normalizeSponsorList(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const name = String(item.name || "").trim().slice(0, 100);
    const email = normalizeEmail(item.email);
    if (!name || !isValidEmail(email)) continue;
    out.push({ name, email });
  }
  return out.slice(0, 10);
}

/** @param {string} slug */
export function getDirectorySponsorsForSlug(slug) {
  const club = getClubBySlug(slug);
  return normalizeSponsorList(club?.sponsors || []);
}

/**
 * @param {string} slug
 * @param {Record<string, { name: string, email: string }[]> | null | undefined} overridesBySlug
 */
export function getEffectiveSponsorsForSlug(slug, overridesBySlug) {
  if (overridesBySlug && Object.prototype.hasOwnProperty.call(overridesBySlug, slug)) {
    return overridesBySlug[slug] || [];
  }
  return getDirectorySponsorsForSlug(slug);
}

/**
 * @param {string | null | undefined} email
 * @param {Record<string, { name: string, email: string }[]> | null | undefined} overridesBySlug
 */
export function getSponsorClubSlugsForEmail(email, overridesBySlug = null) {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];

  const slugs = [];
  for (const club of BROAD_RUN_CLUBS) {
    const slug = clubNameToSlug(club.name);
    const sponsors = getEffectiveSponsorsForSlug(slug, overridesBySlug);
    if (sponsors.some((sponsor) => emailsEqual(sponsor.email, normalized))) {
      slugs.push(slug);
    }
  }
  return slugs;
}

/** @returns {Promise<Record<string, { name: string, email: string }[]>>} */
export async function fetchAllClubSponsorOverrides() {
  if (!firestore) return {};
  const snap = await getDocs(collection(firestore, CLUB_HUB_SPONSORS_COLLECTION));
  /** @type {Record<string, { name: string, email: string }[]>} */
  const map = {};
  for (const d of snap.docs) {
    map[d.id] = normalizeSponsorList(d.data()?.sponsors);
  }
  return map;
}

/**
 * @param {{
 *   slug: string,
 *   clubName: string,
 *   sponsors: { name: string, email: string }[],
 *   adminUid: string,
 * }} args
 */
export async function saveClubSponsors({ slug, clubName, sponsors, adminUid }) {
  if (!firestore) throw new Error("Firebase is not configured.");
  if (!slug) throw new Error("Missing club slug.");
  if (!adminUid) throw new Error("Not signed in.");

  assertClientRateLimit("clubHubPageWrite", adminUid);

  const normalizedSponsors = normalizeSponsorList(sponsors);
  await setDoc(
    doc(firestore, CLUB_HUB_SPONSORS_COLLECTION, slug),
    {
      slug,
      clubName: String(clubName || "").trim().slice(0, 120),
      sponsors: normalizedSponsors,
      updatedAt: serverTimestamp(),
      updatedBy: adminUid,
    },
    { merge: true },
  );

  return normalizedSponsors;
}

/** @param {{ slug: string, adminUid: string }} args */
export async function resetClubSponsorsToDirectory({ slug, adminUid }) {
  if (!firestore) throw new Error("Firebase is not configured.");
  if (!slug) throw new Error("Missing club slug.");
  if (!adminUid) throw new Error("Not signed in.");

  assertClientRateLimit("clubHubPageWrite", adminUid);
  await deleteDoc(doc(firestore, CLUB_HUB_SPONSORS_COLLECTION, slug));
}
