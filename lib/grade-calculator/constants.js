/** LCPS secondary weighting; Synergy's chart view doesn't copy as text, so this is usually what applies. */
export const DEFAULT_WEIGHTS = {
  "Major Summative": 80,
  "Minor Summative": 10,
  "Graded Formative": 10,
  "Formative Assessment": 10,
  "Extra Credit": 0,
  "Other": 0,
};

/** Synergy category names vary by school ("Graded Formative" vs "Formative Assessment", etc.). */
export const CATEGORY_PATTERN =
  /^((Major|Minor|Graded|Diagnostic)\s+(Summative|Formative)|(Formative|Summative)\s+Assessments?)$/i;

export const NAVIGATION_ITEMS = [
  "Home",
  "Synergy",
  "Mail",
  "Calendar",
  "Attendance",
  "Class Schedule",
  "Course History",
  "Grade Book",
  "MTSS",
  "School Information",
  "Student Info",
  "Test History",
  "Documents",
  "Totals",
];
