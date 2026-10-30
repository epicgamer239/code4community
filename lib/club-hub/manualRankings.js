import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@/firebase";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import { getClubBySlug } from "@/lib/club-hub/broadRunClubDirectory";

export const CLUB_HUB_MANUAL_RANKINGS = "clubHubManualRankings";

/** @typedef {"engagement" | "volunteer"} ManualRankingKind */

/** @type {ManualRankingKind[]} */
export const MANUAL_RANKING_KINDS = ["engagement", "volunteer"];

export const MANUAL_RANKING_TITLES = {
  engagement: "Club Engagement Rankings",
  volunteer: "Club Volunteer Rankings",
};

/**
 * @param {unknown} value
 * @returns {ManualRankingKind | null}
 */
export function normalizeManualRankingKind(value) {
  return MANUAL_RANKING_KINDS.includes(/** @type {ManualRankingKind} */ (value))
    ? /** @type {ManualRankingKind} */ (value)
    : null;
}

/**
 * Normalize up to 3 club slugs for a ranking board.
 * @param {unknown} raw
 * @returns {string[]} length 3, empty string = unset
 */
export function normalizeManualRankingSlugs(raw) {
  const list = Array.isArray(raw) ? raw : [];
  /** @type {string[]} */
  const out = [];
  const seen = new Set();
  for (let i = 0; i < 3; i++) {
    const slug = typeof list[i] === "string" ? list[i].trim().slice(0, 120) : "";
    if (slug && seen.has(slug)) {
      out.push("");
      continue;
    }
    if (slug) seen.add(slug);
    out.push(slug);
  }
  while (out.length < 3) out.push("");
  return out.slice(0, 3);
}

/**
 * @param {string[]} slugs
 * @returns {{ rank: number, name: string, clubSlug: string, placeholder?: boolean }[]}
 */
export function rankingRowsFromSlugs(slugs) {
  return normalizeManualRankingSlugs(slugs).map((slug, index) => {
    const rank = index + 1;
    if (!slug) {
      return { rank, name: "—", clubSlug: "", placeholder: true };
    }
    const club = getClubBySlug(slug);
    return {
      rank,
      name: club?.name || slug,
      clubSlug: slug,
    };
  });
}

/**
 * @param {ManualRankingKind} kind
 * @returns {Promise<string[]>}
 */
export async function fetchManualRankingSlugs(kind) {
  if (!firestore || !normalizeManualRankingKind(kind)) {
    return ["", "", ""];
  }
  const snap = await getDoc(doc(firestore, CLUB_HUB_MANUAL_RANKINGS, kind));
  if (!snap.exists()) return ["", "", ""];
  return normalizeManualRankingSlugs(snap.data()?.slugs);
}

/**
 * @returns {Promise<{ engagement: string[], volunteer: string[] }>}
 */
export async function fetchAllManualRankingSlugs() {
  const [engagement, volunteer] = await Promise.all([
    fetchManualRankingSlugs("engagement"),
    fetchManualRankingSlugs("volunteer"),
  ]);
  return { engagement, volunteer };
}

/**
 * @param {import("firebase/auth").User} user
 * @param {{ kind: ManualRankingKind, slugs: string[] }} args
 */
export async function saveManualRankingClient(user, args) {
  if (!user?.getIdToken) throw new Error("Not signed in.");
  assertClientRateLimit("clubHubPageWrite", user.uid);
  const kind = normalizeManualRankingKind(args.kind);
  if (!kind) throw new Error("Unknown ranking board.");
  const slugs = normalizeManualRankingSlugs(args.slugs);
  const token = await user.getIdToken();
  const res = await fetch("/api/club-hub/admin/manual-rankings", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ kind, slugs }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not save rankings.");
  return normalizeManualRankingSlugs(data.slugs);
}
