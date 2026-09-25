import { isAdminEmail } from "@/lib/admin";
import { normalizeEmail } from "@/lib/email";
import {
  CLUB_HUB_ACCESS_COLLECTION,
  clubHubAccessDocId,
  isClubHubCoordinatorEmail,
} from "@/lib/club-hub/access";

/**
 * Server-side Club Hub admin check (site super admin or club coordinator).
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {string | null | undefined} email
 */
export async function isClubHubAdminEmail(db, email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  if (isAdminEmail(normalized)) return true;
  const snap = await db
    .collection(CLUB_HUB_ACCESS_COLLECTION)
    .doc(clubHubAccessDocId(normalized))
    .get();
  return isClubHubCoordinatorEmail(normalized, snap.exists ? snap.data() : null);
}
