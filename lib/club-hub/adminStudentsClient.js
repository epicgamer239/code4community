/**
 * @param {import("firebase/auth").User} user
 * @param {string} query
 */
export async function searchStudentsForAdminClient(user, query) {
  if (!user?.getIdToken) throw new Error("Sign in required.");
  const q = query.trim();
  if (q.length < 2) return [];
  const token = await user.getIdToken();
  const res = await fetch(`/api/club-hub/admin/students?q=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Search failed.");
  return Array.isArray(data.results) ? data.results : [];
}

/**
 * @param {import("firebase/auth").User} user
 * @param {string} userId
 */
export async function fetchStudentHubProfileClient(user, userId) {
  if (!user?.getIdToken) throw new Error("Sign in required.");
  const token = await user.getIdToken();
  const res = await fetch(
    `/api/club-hub/admin/students?userId=${encodeURIComponent(userId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not load student.");
  return data;
}

/** @param {import("firebase/auth").User} user */
export async function fetchRegisteredStudentEmailsClient(user) {
  if (!user?.getIdToken) throw new Error("Sign in required.");
  const token = await user.getIdToken();
  const res = await fetch("/api/club-hub/admin/students?accountEmails=1", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not load accounts.");
  return Array.isArray(data.emails) ? data.emails : [];
}

/** @param {import("firebase/auth").User} user @param {string} email */
export async function fetchStudentHubProfileByEmailClient(user, email) {
  if (!user?.getIdToken) throw new Error("Sign in required.");
  const token = await user.getIdToken();
  const res = await fetch(
    `/api/club-hub/admin/students?email=${encodeURIComponent(email.trim())}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not load student.");
  return data;
}

/**
 * @param {import("firebase/auth").User} user
 * @param {Record<string, unknown>} body
 */
async function postStudentAdminAction(user, body) {
  if (!user?.getIdToken) throw new Error("Sign in required.");
  const token = await user.getIdToken();
  const res = await fetch("/api/club-hub/admin/students", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Action failed.");
  return data;
}

/** @param {import("firebase/auth").User} user @param {{ userId: string, clubSlug: string }} args */
export function adminRemoveStudentFromClubClient(user, args) {
  return postStudentAdminAction(user, { action: "removeMembership", ...args });
}

/** @param {import("firebase/auth").User} user @param {{ userId: string, goldClubSlug: string, maroonClubSlug: string }} args */
export function adminSetStudentMeetingChoicesClient(user, args) {
  return postStudentAdminAction(user, { action: "setMeetingChoices", ...args });
}

/** @param {import("firebase/auth").User} user @param {{ userId: string, eventId: string, enrolled: boolean }} args */
export function adminSetStudentSpecialEventClient(user, args) {
  return postStudentAdminAction(user, { action: "setSpecialEventEnrollment", ...args });
}
