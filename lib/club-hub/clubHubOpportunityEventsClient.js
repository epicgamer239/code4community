import { clubHubSchoolIdQuery, withClubHubSchoolId } from "@/lib/club-hub/schoolIdClient";

/**
 * @param {import("firebase/auth").User} user
 */
export async function fetchClubHubOpportunityEventsAdminClient(user) {
  if (!user?.getIdToken) throw new Error("Sign in required.");
  const token = await user.getIdToken();
  const res = await fetch(`/api/club-hub/admin/opportunity-events?${clubHubSchoolIdQuery()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not load events.");
  return Array.isArray(data.events) ? data.events : [];
}

/**
 * @param {import("firebase/auth").User} user
 * @param {{ title: string, description: string, eventDate?: string }} payload
 */
export async function createClubHubOpportunityEventClient(user, payload) {
  if (!user?.getIdToken) throw new Error("Sign in required.");
  const token = await user.getIdToken();
  const res = await fetch("/api/club-hub/admin/opportunity-events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(withClubHubSchoolId(payload)),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not create event.");
  return data;
}

/**
 * @param {import("firebase/auth").User} user
 * @param {string} eventId
 */
export async function deleteClubHubOpportunityEventClient(user, eventId) {
  if (!user?.getIdToken) throw new Error("Sign in required.");
  const token = await user.getIdToken();
  const res = await fetch(
    `/api/club-hub/admin/opportunity-events?eventId=${encodeURIComponent(eventId)}&${clubHubSchoolIdQuery()}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not delete event.");
  return data;
}

export async function fetchPublicClubHubOpportunityEvents() {
  const res = await fetch(`/api/club-hub/opportunity-events?${clubHubSchoolIdQuery()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not load events.");
  return Array.isArray(data.events) ? data.events : [];
}
