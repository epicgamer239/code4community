/** Display name from Firestore profile / auth user fields. */
export function resolveDisplayName(profile, fallback = "") {
  if (!profile) return fallback;
  const display =
    typeof profile.displayName === "string" ? profile.displayName.trim() : "";
  if (display) return display;
  const parts = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
  if (parts) return parts;
  const email = typeof profile.email === "string" ? profile.email.trim() : "";
  if (email) {
    const local = email.split("@")[0];
    return local || email;
  }
  return fallback;
}

/** Two-letter avatar initials from a display name. */
export function getInitials(name) {
  if (!name) return "?";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

/** Writing Center role stored in Firestore (uppercase). */
export function normalizeWritingCenterRole(role) {
  return (role || "STUDENT").toUpperCase();
}

/**
 * Which Writing Center UI to show: STUDENT | TUTOR | ADMIN | TEACHER.
 * Tutors use writingCenterRole; legacy role=tutor still works.
 * @param {{ role?: string, writingCenterRole?: string } | null | undefined} userData
 */
export function resolveWritingCenterViewRole(userData) {
  const role = (userData?.role || "student").toLowerCase();
  if (role === "admin") return "ADMIN";
  if (role === "teacher") return "TEACHER";
  if (userData?.writingCenterRole === "tutor" || role === "tutor") return "TUTOR";
  return "STUDENT";
}
