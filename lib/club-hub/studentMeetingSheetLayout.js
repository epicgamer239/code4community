export const STUDENT_MEETING_TAB = "Student meeting clubs";

export const STUDENT_MEETING_BASE_HEADERS = ["Student name", "Gold club", "Maroon club"];
export const STUDENT_MEETING_USER_ID_HEADER = "User ID";

/**
 * @param {{ columnLabel?: string, title?: string }[]} specialEvents
 */
export function buildStudentMeetingSheetHeaders(specialEvents) {
  const specialHeaders = specialEvents.map(
    (ev) => ev.columnLabel?.trim() || ev.title?.trim() || "Special event",
  );
  return [...STUDENT_MEETING_BASE_HEADERS, ...specialHeaders, STUDENT_MEETING_USER_ID_HEADER];
}

/** @param {number} specialEventCount */
export function studentMeetingUserIdColumnIndex(specialEventCount) {
  return STUDENT_MEETING_BASE_HEADERS.length + specialEventCount;
}

/**
 * @param {string} userId
 * @param {{ studentUserIds?: string[], title?: string }[]} specialEvents
 */
export function specialEventCellsForUser(userId, specialEvents) {
  return specialEvents.map((ev) => {
    const ids = ev.studentUserIds || [];
    return ids.includes(userId) ? ev.title || "✓" : "";
  });
}
