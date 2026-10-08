import { getAdminFirestore } from "@/lib/firebase/admin";
import { isAdminEmail } from "@/lib/admin";
import { normalizeEmail } from "@/lib/email";
import {
  getSponsorClubSlugsForEmail,
  isClubHubCoordinatorEmail,
} from "@/lib/club-hub/access";
import { fetchClubHubAccessForEmailServer } from "@/lib/club-hub/clubHubRolesServer";
import { loadClubSponsorOverrides } from "@/lib/club-hub/syncSponsorAccessServer";

/**
 * @param {string} token
 * @returns {Promise<{ uid: string, email: string }>}
 */
export async function requireAuthFromBearerToken(token) {
  if (!token) throw new Error("Missing auth token.");
  const { getAuth } = await import("firebase-admin/auth");
  const decoded = await getAuth().verifyIdToken(token);
  const email = normalizeEmail(decoded.email);
  const uid = decoded.uid;
  if (!email || !uid) throw new Error("Invalid auth token.");
  return { uid, email };
}

/**
 * Sponsors, club coordinators, and site admins may manage board members.
 *
 * @param {{ email: string, uid: string, clubSlug: string }} args
 */
export async function assertCanManageBoardMembersForClub({ email, uid, clubSlug }) {
  const slug = clubSlug?.trim();
  if (!slug) throw new Error("Missing club.");

  const db = getAdminFirestore();
  if (!db) throw new Error("Server Firebase is not configured.");

  if (isAdminEmail(email)) return { uid, email };

  const overrides = await loadClubSponsorOverrides(db);
  const accessRecord = await fetchClubHubAccessForEmailServer(db, email);

  if (isClubHubCoordinatorEmail(email, accessRecord)) return { uid, email };

  const sponsorSlugs = getSponsorClubSlugsForEmail(email, overrides);
  if (!sponsorSlugs.includes(slug)) {
    throw new Error("Only the club sponsor can manage board members.");
  }

  return { uid, email };
}
