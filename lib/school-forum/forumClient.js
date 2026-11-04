/** Browser → /api/school-forum calls. All forum data goes through these routes, never Firestore directly. */

export class ForumClientError extends Error {
  constructor(message, { status = 0, code = "", fieldErrors = null } = {}) {
    super(message);
    this.name = "ForumClientError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * @param {import("firebase/auth").User} user
 * @param {string} path e.g. "/overview"
 * @param {{ method?: string, body?: unknown }} [options]
 */
export async function forumFetch(user, path, { method = "GET", body } = {}) {
  if (!user?.getIdToken) throw new ForumClientError("Sign in to use the forum.", { status: 401 });
  const token = await user.getIdToken();
  const res = await fetch(`/api/school-forum${path}`, {
    method,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ForumClientError(data.error || "Something went wrong. Please try again.", {
      status: res.status,
      code: data.code || "",
      fieldErrors: data.fieldErrors || null,
    });
  }
  return data;
}

/** Fetch the metrics CSV with auth and hand it to the browser as a download. */
export async function downloadForumMetricsCsv(user) {
  const token = await user.getIdToken();
  const res = await fetch("/api/school-forum/admin/metrics?format=csv", {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ForumClientError(data.error || "Could not export metrics.", { status: res.status });
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "school-forum-metrics.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
