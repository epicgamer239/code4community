/** Placeholder student id for admin-assigned mini lessons (not a real user). */
export const MINI_LESSON_STUDENT_ID = "wc-mini-lesson";

export const MINI_LESSON_STUDENT_NAME = "Mini lesson";
export const MINI_LESSON_STUDENT_EMAIL = "mini-lesson@internal.writingcenter";

/** Date input (YYYY-MM-DD) → Date at local noon for Firestore createdAt. */
export function miniLessonDateToDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return new Date();
  const parts = dateStr.split("-").map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
}

export function isMiniLessonSession(session) {
  return session?.sessionType === "MINI_LESSON";
}
