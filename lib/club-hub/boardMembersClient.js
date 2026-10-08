import { CLUB_MEMBER_GROUP_BOARD } from "@/lib/club-hub/clubBoardGroups";

/**
 * @param {import("firebase/auth").User} user
 * @param {string} clubSlug
 */
export async function fetchBoardMembersForClubClient(user, clubSlug) {
  if (!user?.getIdToken || !clubSlug) return [];
  const token = await user.getIdToken();
  const res = await fetch(
    `/api/club-hub/sponsor/board-members?clubSlug=${encodeURIComponent(clubSlug)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not load board members.");
  return Array.isArray(data.members) ? data.members : [];
}

/**
 * @param {import("firebase/auth").User} user
 * @param {{ clubSlug: string, email: string, displayName?: string }} args
 */
export async function addBoardMemberClient(user, args) {
  if (!user?.getIdToken) throw new Error("Sign in required.");
  const token = await user.getIdToken();
  const res = await fetch("/api/club-hub/sponsor/board-members", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not add board member.");
  return data;
}

/**
 * @param {import("firebase/auth").User} user
 * @param {{ clubSlug: string, email: string }} args
 */
export async function removeBoardMemberClient(user, args) {
  if (!user?.getIdToken) throw new Error("Sign in required.");
  const token = await user.getIdToken();
  const res = await fetch("/api/club-hub/sponsor/board-members", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not remove board member.");
  return data;
}

/** @param {string[] | undefined} groups */
export function membershipHasBoardGroup(groups) {
  return Array.isArray(groups) && groups.includes(CLUB_MEMBER_GROUP_BOARD);
}
