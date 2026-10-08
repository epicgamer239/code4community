/**
 * @param {import("firebase/auth").User} user
 */
export async function fetchSpecialSheetEventsClient(user) {
  const token = await user.getIdToken();
  const res = await fetch("/api/club-hub/admin/special-sheet-events", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not load special events.");
  return data.events || [];
}

/**
 * @param {import("firebase/auth").User} user
 * @param {{ title: string, meetingSlot: "gold" | "maroon", studentListPaste: string }} payload
 */
export async function createSpecialSheetEventClient(user, payload) {
  const token = await user.getIdToken();
  const res = await fetch("/api/club-hub/admin/special-sheet-events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.warning || "Could not create special event.");
  return data;
}
