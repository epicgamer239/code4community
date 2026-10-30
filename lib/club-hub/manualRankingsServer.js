import { FieldValue } from "firebase-admin/firestore";
import { getClubBySlug } from "@/lib/club-hub/broadRunClubDirectory";
import {
  CLUB_HUB_MANUAL_RANKINGS,
  MANUAL_RANKING_KINDS,
  normalizeManualRankingKind,
  normalizeManualRankingSlugs,
} from "@/lib/club-hub/manualRankings";

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {string} kind
 */
export async function getManualRankingSlugsServer(db, kind) {
  const normalized = normalizeManualRankingKind(kind);
  if (!normalized) return ["", "", ""];
  const snap = await db.collection(CLUB_HUB_MANUAL_RANKINGS).doc(normalized).get();
  if (!snap.exists) return ["", "", ""];
  return normalizeManualRankingSlugs(snap.data()?.slugs);
}

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 */
export async function listManualRankingsServer(db) {
  /** @type {Record<string, string[]>} */
  const out = {};
  for (const kind of MANUAL_RANKING_KINDS) {
    out[kind] = await getManualRankingSlugsServer(db, kind);
  }
  return out;
}

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {{ kind: string, slugs: unknown, adminUid: string }} args
 */
export async function setManualRankingSlugsServer(db, args) {
  const kind = normalizeManualRankingKind(args.kind);
  if (!kind) throw new Error("Unknown ranking board.");
  const slugs = normalizeManualRankingSlugs(args.slugs);
  for (const slug of slugs) {
    if (!slug) continue;
    if (!getClubBySlug(slug)) {
      throw new Error(`Unknown club: ${slug}`);
    }
  }
  const adminUid = String(args.adminUid || "").trim();
  if (!adminUid) throw new Error("Not signed in.");

  await db.collection(CLUB_HUB_MANUAL_RANKINGS).doc(kind).set(
    {
      kind,
      slugs,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: adminUid,
    },
    { merge: true },
  );
  return slugs;
}
