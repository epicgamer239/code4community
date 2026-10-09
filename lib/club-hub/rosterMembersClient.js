/**
 * @param {import("firebase/auth").User} user
 * @param {{ clubSlug: string, userId: string }} args
 */
export async function removeClubRosterMemberClient(user, args) {
  if (!user?.getIdToken) throw new Error("Sign in required.");
  const clubSlug = args.clubSlug?.trim();
  const userId = args.userId?.trim();
  if (!clubSlug || !userId) throw new Error("Missing club or member.");

  const token = await user.getIdToken();
  const res = await fetch("/api/club-hub/sponsor/roster-members", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ clubSlug, userId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not remove member.");
  return data;
}
