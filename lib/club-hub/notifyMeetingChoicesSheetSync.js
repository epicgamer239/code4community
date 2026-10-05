/**
 * Fire-and-forget sync of Gold/Maroon choices to Google Sheets.
 * @param {import("firebase/auth").User} user
 */
export async function notifyMeetingChoicesSheetSync(user) {
  if (!user?.getIdToken) return;
  try {
    const token = await user.getIdToken();
    await fetch("/api/club-hub/meeting-choices-sheet-sync", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
  } catch {
    // Firestore is source of truth; sheet is best-effort.
  }
}
