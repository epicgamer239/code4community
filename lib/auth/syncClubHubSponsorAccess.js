import { logClientError } from "@/lib/auth/logClientError";
import { invalidateClubHubAccessCache } from "@/lib/club-hub/useClubHubAccess";
import { getClubHubSchool } from "@/lib/club-hub/activeSchool";

/**
 * Sync directory-based sponsor club access for the signed-in user.
 * Always POSTs — the API loads sponsor overrides server-side, so override-only
 * sponsors still receive clubHubAccess.directoryClubSlugs for Firestore rules.
 * @param {{ getIdToken?: () => Promise<string> } | null | undefined} currentUser
 * @param {{ schoolId?: string } | null | undefined} [opts]
 */
export async function syncClubHubSponsorAccess(currentUser, opts = null) {
  if (!currentUser?.getIdToken) return;
  try {
    const token = await currentUser.getIdToken();
    const schoolId = opts?.schoolId || getClubHubSchool().schoolId;
    const res = await fetch("/api/club-hub/sync-sponsor-access", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ schoolId }),
    });
    if (res.ok) {
      invalidateClubHubAccessCache();
    }
  } catch (error) {
    logClientError("syncClubHubSponsorAccess", error);
  }
}
