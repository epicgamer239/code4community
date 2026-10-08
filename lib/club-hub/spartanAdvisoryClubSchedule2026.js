/**
 * Broad Run 2026–27 Spartan Advisory / Club meeting schedule.
 * (A) = Gold day, (B) = Maroon day in LCPS rotation.
 */

/** @typedef {"advisory" | "gold" | "maroon" | "planned"} SpartanScheduleKind */

/** @typedef {{ date: string, kind: SpartanScheduleKind, title: string, dayType?: "A" | "B", note?: string }} SpartanScheduleEntry */

/** @type {SpartanScheduleEntry[]} */
export const SPARTAN_ADVISORY_CLUB_SCHEDULE = [
  { date: "2026-08-19", kind: "planned", title: "SCA", dayType: "A" },
  { date: "2026-08-26", kind: "advisory", title: "Advisory lesson", dayType: "B" },

  { date: "2026-09-02", kind: "advisory", title: "Advisory lesson", dayType: "A", note: "Club preview month" },
  { date: "2026-09-09", kind: "gold", title: "Gold club meeting", dayType: "B" },
  { date: "2026-09-16", kind: "maroon", title: "Maroon club meeting", dayType: "A" },
  { date: "2026-09-23", kind: "planned", title: "C.A.R.E", dayType: "A" },
  { date: "2026-09-30", kind: "planned", title: "PSAT test prep", dayType: "B" },

  { date: "2026-10-07", kind: "advisory", title: "Advisory lesson", dayType: "A" },
  { date: "2026-10-14", kind: "gold", title: "Gold club meeting", dayType: "A" },
  { date: "2026-10-21", kind: "maroon", title: "Maroon club meeting", dayType: "B" },
  { date: "2026-10-28", kind: "planned", title: "T.H.I.N.K Before You Speak", dayType: "A" },

  { date: "2026-11-04", kind: "advisory", title: "Advisory lesson", dayType: "B" },
  { date: "2026-11-11", kind: "gold", title: "Gold club meeting", dayType: "B" },
  { date: "2026-11-18", kind: "maroon", title: "Maroon club meeting", dayType: "A" },

  { date: "2026-12-02", kind: "advisory", title: "Advisory lesson", dayType: "B" },
  { date: "2026-12-09", kind: "gold", title: "Gold club meeting", dayType: "A" },
  { date: "2026-12-16", kind: "maroon", title: "Maroon club meeting", dayType: "B" },

  {
    date: "2027-01-06",
    kind: "advisory",
    title: "Advisory lesson",
    dayType: "A",
    note: "Course selection overview",
  },
  { date: "2027-01-13", kind: "gold", title: "Gold club meeting", dayType: "B" },
  {
    date: "2027-01-20",
    kind: "maroon",
    title: "Electives fair",
    dayType: "B",
    note: "No club meetings",
  },
  { date: "2027-01-27", kind: "planned", title: "Club photos", dayType: "B" },

  { date: "2027-02-03", kind: "advisory", title: "Advisory lesson", dayType: "A" },
  { date: "2027-02-10", kind: "gold", title: "Gold club meeting", dayType: "A" },
  { date: "2027-02-17", kind: "maroon", title: "Maroon club meeting", dayType: "A" },
  { date: "2027-02-24", kind: "planned", title: "Equity", dayType: "B" },

  { date: "2027-03-03", kind: "advisory", title: "Advisory lesson", dayType: "A" },
  { date: "2027-03-10", kind: "planned", title: "SOL testing", dayType: "B" },
  { date: "2027-03-17", kind: "gold", title: "Gold club meeting", dayType: "A" },
  { date: "2027-03-31", kind: "maroon", title: "Maroon club meeting", dayType: "B" },

  { date: "2027-04-07", kind: "advisory", title: "Advisory lesson", dayType: "A" },
  { date: "2027-04-14", kind: "gold", title: "Gold club meeting", dayType: "A" },
  { date: "2027-04-21", kind: "planned", title: "PEER", dayType: "B" },
  { date: "2027-04-28", kind: "maroon", title: "Maroon club meeting", dayType: "A" },

  {
    date: "2027-05-05",
    kind: "advisory",
    title: "Advisory lesson",
    dayType: "B",
    note: "AP testing",
  },
  {
    date: "2027-05-12",
    kind: "gold",
    title: "Gold club meeting",
    dayType: "A",
    note: "AP testing",
  },
  { date: "2027-05-19", kind: "maroon", title: "Maroon club meeting", dayType: "B" },
  { date: "2027-05-26", kind: "planned", title: "Equity", dayType: "A" },

  { date: "2027-06-02", kind: "planned", title: "SOL testing", dayType: "A" },
  {
    date: "2027-06-09",
    kind: "maroon",
    title: "Maroon club meeting",
    dayType: "B",
    note: "SOL retakes",
  },
];

/** @param {SpartanScheduleEntry} entry */
function scheduleEntryToBlock(entry) {
  const dayLabel = entry.dayType ? `${entry.dayType} day` : "Advisory block";
  return {
    time: dayLabel,
    title: entry.title,
    location: "School-wide",
    note: entry.note || "26–27 Spartan schedule",
    description: "",
    clubName: "",
    clubSlug: "",
    eventId: "",
    scheduleKind: entry.kind,
    isSpartanSchedule: true,
  };
}

/** @param {string} dateKey @param {string} rangeStart @param {string} rangeEnd */
function dateInRange(dateKey, rangeStart, rangeEnd) {
  return dateKey >= rangeStart && dateKey <= rangeEnd;
}

/**
 * @param {Record<string, import("./clubEvents.js").CalendarEventBlock[]>} eventsByDate
 * @param {string} rangeStart
 * @param {string} rangeEnd
 */
export function mergeSpartanScheduleIntoEventsByDate(eventsByDate, rangeStart, rangeEnd) {
  const out = { ...eventsByDate };
  for (const entry of SPARTAN_ADVISORY_CLUB_SCHEDULE) {
    if (!dateInRange(entry.date, rangeStart, rangeEnd)) continue;
    const block = scheduleEntryToBlock(entry);
    out[entry.date] = [...(out[entry.date] || []), block];
  }
  return out;
}

export const SPARTAN_SCHEDULE_LABEL = "26–27 Spartan advisory & club meetings";

/** @type {Record<string, SpartanScheduleKind[]>} */
const KINDS_BY_DATE = {};

for (const entry of SPARTAN_ADVISORY_CLUB_SCHEDULE) {
  if (!KINDS_BY_DATE[entry.date]) KINDS_BY_DATE[entry.date] = [];
  KINDS_BY_DATE[entry.date].push(entry.kind);
}

/**
 * Primary tint for a calendar day cell (club meetings beat advisory/planned).
 * @param {string} dateKey YYYY-MM-DD
 * @returns {SpartanScheduleKind | null}
 */
export function getSpartanDayHighlightKind(dateKey) {
  const kinds = KINDS_BY_DATE[dateKey];
  if (!kinds?.length) return null;
  if (kinds.includes("gold")) return "gold";
  if (kinds.includes("maroon")) return "maroon";
  if (kinds.includes("advisory")) return "advisory";
  if (kinds.includes("planned")) return "planned";
  return null;
}
