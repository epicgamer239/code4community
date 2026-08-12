export const MATHLAB_COURSES = [
  "Precalculus (any level)",
  "AP Calc AB",
  "AP Calc BC",
  "DE Multivariable Calc",
];

const COURSE_SET = new Set(MATHLAB_COURSES);

/**
 * @param {unknown} value
 * @returns {string[]}
 */
export function normalizeEligibleCourses(value) {
  if (!Array.isArray(value)) return [];
  const next = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const course = item.trim();
    if (!COURSE_SET.has(course) || next.includes(course)) continue;
    next.push(course);
  }
  return next;
}

/**
 * Empty / missing list means all courses (legacy tutors stay unrestricted).
 * @param {{ mathLabEligibleCourses?: unknown, role?: string } | null | undefined} user
 * @param {string} course
 */
export function tutorCanTakeCourse(user, course) {
  if (!course) return false;
  const role = (user?.role || "").toLowerCase();
  // Teachers and admins can take any course.
  if (role === "admin" || role === "teacher") return true;

  const allowed = normalizeEligibleCourses(user?.mathLabEligibleCourses);
  if (allowed.length === 0) return true;
  return allowed.includes(course);
}

/** @param {string[]} courses */
export function eligibleCoursesLabel(courses) {
  const normalized = normalizeEligibleCourses(courses);
  if (normalized.length === 0) return "All courses";
  return normalized.join(" · ");
}
