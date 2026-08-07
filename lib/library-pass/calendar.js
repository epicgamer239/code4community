/**
 * LCPS 2026–27 A/B day calendar (lcps.org/abdays).
 * School days alternate A → B starting Aug 17, 2026 (A), skipping weekends
 * and the holidays/student holidays listed below. Last day (Jun 11, 2027) is
 * published as an A day.
 */

export const LIBRARY_PASS_FIRST_YMD = "2026-08-17";
export const LIBRARY_PASS_LAST_YMD = "2027-06-11";

/** Non-instructional weekdays (holidays, student holidays, breaks). */
const NON_SCHOOL_DAYS = new Set([
  "2026-09-04", // Student Holiday
  "2026-09-07", // Labor Day
  "2026-09-21", // Yom Kippur
  "2026-10-12", // Indigenous Peoples' Day
  "2026-10-29", // Student Holiday
  "2026-10-30", // Student Holiday
  "2026-11-02", // Student Holiday
  "2026-11-03", // Student Holiday
  "2026-11-09", // Diwali
  "2026-11-25", // Thanksgiving Break
  "2026-11-26",
  "2026-11-27",
  // Winter Break Dec 21 – Jan 1
  "2026-12-21",
  "2026-12-22",
  "2026-12-23",
  "2026-12-24",
  "2026-12-25",
  "2026-12-26",
  "2026-12-27",
  "2026-12-28",
  "2026-12-29",
  "2026-12-30",
  "2026-12-31",
  "2027-01-01",
  "2027-01-18", // MLK Jr Day
  "2027-01-25", // Student Holiday
  "2027-02-05", // Lunar New Year
  "2027-02-15", // Presidents' Day
  "2027-03-08", // Student Holiday
  "2027-03-09", // Eid al Fitr
  "2027-03-22", // Spring Break
  "2027-03-23",
  "2027-03-24",
  "2027-03-25",
  "2027-03-26",
  "2027-04-12", // Student Holiday
  "2027-05-31", // Memorial Day
]);

function ymdFromParts(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseYmdLocal(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function buildAbSchedule() {
  /** @type {Record<string, "A" | "B">} */
  const schedule = {};
  let type = /** @type {"A" | "B"} */ ("A");
  const d = parseYmdLocal(LIBRARY_PASS_FIRST_YMD);
  const end = parseYmdLocal(LIBRARY_PASS_LAST_YMD);
  while (d <= end) {
    const key = ymdFromParts(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6 && !NON_SCHOOL_DAYS.has(key)) {
      schedule[key] = type;
      type = type === "A" ? "B" : "A";
    }
    d.setDate(d.getDate() + 1);
  }
  // Published calendar marks last day as A (strict alternation would be B).
  schedule[LIBRARY_PASS_LAST_YMD] = "A";
  return schedule;
}

export const LCPS_AB_SCHEDULE = buildAbSchedule();

/** @param {string} ymd YYYY-MM-DD */
export function getScheduledDayType(ymd) {
  return LCPS_AB_SCHEDULE[ymd] ?? null;
}

/** @param {string} ymd YYYY-MM-DD */
export function isLibraryPassDay(ymd) {
  return ymd in LCPS_AB_SCHEDULE;
}
