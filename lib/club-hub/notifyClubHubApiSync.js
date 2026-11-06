/**
 * Fire-and-forget authenticated POST to a Club Hub API route.
 * @param {import("firebase/auth").User} user
 * @param {string} path
 * @param {Record<string, unknown>} [body]
 */
export async function notifyClubHubApiSync(user, path, body = {}) {
  if (!user?.getIdToken) return;
  try {
    const token = await user.getIdToken();
    await fetch(path, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    // Firestore is source of truth; sheet sync is best-effort.
  }
}

/** @param {import("firebase/auth").User} user */
export async function notifyMeetingChoicesSheetSync(user) {
  const { getClubHubSchool } = await import("@/lib/club-hub/activeSchool");
  if (!getClubHubSchool().features.sheets) return;
  return notifyClubHubApiSync(user, "/api/club-hub/meeting-choices-sheet-sync");
}

/**
 * @param {import("firebase/auth").User} user
 * @param {"join" | "leave"} action
 * @param {string} clubSlug
 */
export async function notifyRosterSheetSync(user, action, clubSlug) {
  if (!clubSlug) return;
  const { getClubHubSchool } = await import("@/lib/club-hub/activeSchool");
  if (!getClubHubSchool().features.sheets) return;
  return notifyClubHubApiSync(user, "/api/club-hub/roster-sheet-sync", { action, clubSlug });
}
