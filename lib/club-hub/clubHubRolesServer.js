import { FieldValue } from "firebase-admin/firestore";
import { normalizeAccessRecord } from "@/lib/club-hub/clubHubRoles";
import { clubHubAccessDocId } from "@/lib/club-hub/access";
import { normalizeEmail } from "@/lib/email";

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {string | null | undefined} email
 */
export async function fetchClubHubAccessForEmailServer(db, email) {
  const id = clubHubAccessDocId(email);
  if (!id) return null;
  const snap = await db.collection("clubHubAccess").doc(id).get();
  if (!snap.exists) return null;
  return normalizeAccessRecord(snap.data());
}

/** @param {Record<string, boolean> | null | undefined} map @param {string} slug */
export function slugMapHas(map, slug) {
  return Boolean(map && map[slug] === true);
}

/**
 * @param {ReturnType<typeof normalizeAccessRecord>} accessRecord
 * @param {string} slug
 */
export function accessRecordAllowsClubSlugServer(accessRecord, slug) {
  if (!accessRecord || !slug) return false;
  return (
    slugMapHas(accessRecord.directoryClubSlugs, slug) ||
    slugMapHas(accessRecord.manualClubSlugs, slug) ||
    slugMapHas(accessRecord.boardClubSlugs, slug)
  );
}

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {string} normalizedEmail
 * @param {string} clubSlug
 * @param {boolean} allowed
 * @param {string} updatedByUid
 */
export async function setBoardClubSlugGrant(db, normalizedEmail, clubSlug, allowed, updatedByUid) {
  const id = clubHubAccessDocId(normalizedEmail);
  if (!id || !clubSlug) throw new Error("Missing email or club.");

  const ref = db.collection("clubHubAccess").doc(id);
  const existing = await ref.get();
  const data = existing.exists ? existing.data() : {};
  /** @type {Record<string, boolean>} */
  const boardClubSlugs = { ...(data.boardClubSlugs || {}) };
  if (allowed) {
    boardClubSlugs[clubSlug] = true;
  } else {
    delete boardClubSlugs[clubSlug];
  }

  await ref.set(
    {
      email: normalizedEmail,
      isCoordinator: data.isCoordinator === true,
      manualClubSlugs: data.manualClubSlugs || {},
      directoryClubSlugs: data.directoryClubSlugs || {},
      boardClubSlugs,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: updatedByUid,
    },
    { merge: true },
  );
}
