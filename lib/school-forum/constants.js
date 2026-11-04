/** School Concerns Forum — shared constants (client + server safe). */

export const FORUM_COLLECTIONS = {
  /** Public-safe concern content. Never holds poster identity. */
  CONCERNS: "forumConcerns",
  /** Poster identity, keyed by concern id. Read only by forum admins (server). */
  AUTHORS: "forumConcernAuthors",
  /** Moderation-only data: original text, rejection reason, log. */
  PRIVATE: "forumConcernPrivate",
  /** One doc per voter per cycle: `${cycleId}__${uid}`. */
  BALLOTS: "forumBallots",
  CYCLES: "forumCycles",
  /** Admin responses shown publicly with a concern. */
  RESPONSES: "forumResponses",
  /** Moderator / admin appointments: `${schoolId}__${email}`. */
  STAFF: "forumStaff",
  /** Who revealed a poster's identity, and when. */
  IDENTITY_ACCESS_LOG: "forumIdentityAccessLog",
};

export const FORUM_ROLES = {
  STUDENT: "student",
  MODERATOR: "moderator",
  ADMIN: "admin",
};

/** Moderation lifecycle (not public). */
export const CONCERN_STATES = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  MERGED: "merged",
  SAFETY: "safety",
};

/** Public status board. */
export const PUBLIC_STATUSES = {
  OPEN: "open",
  PRESENTED: "presented",
  IN_PROGRESS: "in_progress",
  RESOLVED: "resolved",
  NOT_POSSIBLE: "not_possible",
};

export const PUBLIC_STATUS_LABELS = {
  open: "Open",
  presented: "Presented",
  in_progress: "In progress",
  resolved: "Resolved",
  not_possible: "Not possible",
};

export const CONCERN_CATEGORIES = {
  SCHOOL: "school",
  DISTRICT: "district",
  OUTSIDE: "outside",
};

export const CONCERN_CATEGORY_LABELS = {
  school: "School can fix",
  district: "Needs district",
  outside: "Outside school control",
};

export const MAX_VOTES_PER_CYCLE = 3;
export const DEFAULT_CYCLE_DAYS = 14;
/** How many top-voted concerns go in the cycle results summary (plus flagged ones). */
export const RESULTS_TOP_COUNT = 10;

export const LIMITS = {
  TITLE_MAX: 120,
  TITLE_MIN: 5,
  BODY_MAX: 2000,
  BODY_MIN: 20,
  REASON_MAX: 500,
  RESPONSE_MAX: 2000,
  NOTE_MAX: 1000,
};

/** Plain-language notice shown on the posting form. Keep in sync with the server rules in permissions.js. */
export const IDENTITY_NOTICE = [
  "Other students will not see your name. Your post appears on the board with no name or username.",
  "SCA moderators who review posts will not see your name either.",
  "Your school account is saved with your post. Only your school's forum admins can look it up, and they only do so for safety concerns or misuse of the forum.",
];

export const POSTING_RULES = [
  "Describe a problem with the school, not a person. Do not name or target any student or staff member.",
  "No harassment, threats, insults, or inappropriate content.",
  "One concern per post. Check the board first: if it's already there, vote for it instead.",
  "Posts are reviewed by SCA moderators before they appear on the board.",
];

export const SAFETY_MESSAGE =
  "This post was not published because it may involve someone's safety. School staff have been told privately. " +
  "Please talk to your school counselor or another trusted adult as soon as you can. " +
  "If someone is in immediate danger, tell a staff member right away or call 911.";
