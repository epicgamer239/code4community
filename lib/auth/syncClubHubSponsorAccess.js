import { logClientError } from "@/lib/auth/logClientError";

/**
 * Sync directory-based sponsor club access for the signed-in user.
 * Always POSTs — the API loads sponsor overrides server-side, so override-only
 * sponsors still receive clubHubAccess.directoryClubSlugs for Firestore rules.
 * @param {{ getIdToken?: () => Promise<string> } | null | undefined} currentUser
 */
export async function syncClubHubSponsorAccess(currentUser) {
  if (!currentUser?.getIdToken) return;
  try {
    const token = await currentUser.getIdToken();
    await fetch("/api/club-hub/sync-sponsor-access", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    logClientError("syncClubHubSponsorAccess", error);
  }
}
