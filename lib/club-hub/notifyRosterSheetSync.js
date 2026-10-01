/**
 * Fire-and-forget mirror to Google Sheets after join/leave.
 * @param {import("firebase/auth").User} user
 * @param {"join" | "leave"} action
 * @param {string} clubSlug
 */
export async function notifyRosterSheetSync(user, action, clubSlug) {
  if (!user?.getIdToken || !clubSlug) return;
  try {
    const token = await user.getIdToken();
    await fetch("/api/club-hub/roster-sheet-sync", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, clubSlug }),
    });
  } catch {
    // Roster UI is Firestore; sheet is best-effort.
  }
}
