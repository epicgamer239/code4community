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

/** @param {{ tutorIds?: string[], tutorId?: string } | null | undefined} session */
export function getMiniLessonTutorIds(session) {
  if (Array.isArray(session?.tutorIds) && session.tutorIds.length > 0) {
    return session.tutorIds.filter(Boolean);
  }
  if (session?.tutorId) return [session.tutorId];
  return [];
}

/** @param {{ assignedTutors?: { name?: string }[], tutorNames?: string[], tutorName?: string } | null | undefined} session */
export function getMiniLessonTutorNames(session) {
  if (Array.isArray(session?.assignedTutors) && session.assignedTutors.length > 0) {
    return session.assignedTutors
      .map((t) => t?.name?.trim())
      .filter(Boolean);
  }
  if (Array.isArray(session?.tutorNames) && session.tutorNames.length > 0) {
    return session.tutorNames.filter(Boolean);
  }
  if (session?.tutorName?.trim()) {
    return session.tutorName
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);
  }
  return [];
}

export function formatMiniLessonTutors(session) {
  const names = getMiniLessonTutorNames(session);
  return names.length > 0 ? names.join(", ") : "Not assigned";
}

export function miniLessonIncludesTutor(session, tutorId) {
  if (!tutorId) return false;
  return getMiniLessonTutorIds(session).includes(tutorId);
}

export function miniLessonNeedsTeacherReport(session) {
  return isMiniLessonSession(session) && !session?.sessionReportUrl && !session?.proofFileUrl;
}

export function overseeingTeacherName(session) {
  const name = session?.teacherName?.trim();
  return name || "Not assigned";
}
