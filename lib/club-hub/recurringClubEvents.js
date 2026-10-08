const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Last day of LCPS 2026–27 student year (inclusive cap for generated meetings). */
export const LCPS_SCHOOL_YEAR_END = "2027-06-11";

/** @param {string} dateKey */
function parseDateKey(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** @param {Date} d */
function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** @param {Date} d @param {number} days */
function addDays(d, days) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/** @param {Date} d */
function nthWeekdayOfMonth(d) {
  const weekday = d.getDay();
  const dayOfMonth = d.getDate();
  let n = 0;
  for (let i = 1; i <= dayOfMonth; i++) {
    const probe = new Date(d.getFullYear(), d.getMonth(), i);
    if (probe.getDay() === weekday) n += 1;
  }
  return n;
}

/** @param {number} year @param {number} month @param {number} weekday 0=Sun @param {number} nth */
function dateFromNthWeekday(year, month, weekday, nth) {
  let count = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    if (d.getDay() === weekday) {
      count += 1;
      if (count === nth) return d;
    }
  }
  return null;
}

/**
 * @param {{
 *   startDate: string,
 *   recurrence: "none" | "weekly" | "monthly",
 *   weeklyDays?: number[],
 *   monthlyMode?: "same-date" | "same-weekday",
 *   endDate?: string,
 *   maxOccurrences?: number,
 * }} options
 * @returns {string[]}
 */
export function expandRecurringEventDates(options) {
  const {
    startDate,
    recurrence,
    weeklyDays = [],
    monthlyMode = "same-weekday",
    endDate = LCPS_SCHOOL_YEAR_END,
    maxOccurrences = 40,
  } = options;

  if (!DATE_RE.test(startDate)) return [];
  if (recurrence === "none") return [startDate];

  const end = DATE_RE.test(endDate) ? endDate : LCPS_SCHOOL_YEAR_END;
  const endDt = parseDateKey(end);
  /** @type {string[]} */
  const keys = [];

  if (recurrence === "weekly") {
    const days = weeklyDays.length ? [...new Set(weeklyDays)].sort((a, b) => a - b) : [parseDateKey(startDate).getDay()];
    let cursor = parseDateKey(startDate);
    cursor.setHours(0, 0, 0, 0);
    const startDt = parseDateKey(startDate);
    startDt.setHours(0, 0, 0, 0);

    while (cursor <= endDt && keys.length < maxOccurrences) {
      if (cursor >= startDt && days.includes(cursor.getDay())) {
        keys.push(toDateKey(cursor));
      }
      cursor = addDays(cursor, 1);
    }
    return keys;
  }

  if (recurrence === "monthly") {
    const first = parseDateKey(startDate);
    const weekday = first.getDay();
    const nth = nthWeekdayOfMonth(first);
    let cursor = new Date(first.getFullYear(), first.getMonth(), 1);

    while (cursor <= endDt && keys.length < maxOccurrences) {
      let meeting = null;
      if (monthlyMode === "same-date") {
        const day = first.getDate();
        const dim = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
        if (day <= dim) {
          meeting = new Date(cursor.getFullYear(), cursor.getMonth(), day);
        }
      } else {
        meeting = dateFromNthWeekday(cursor.getFullYear(), cursor.getMonth(), weekday, nth);
      }
      if (meeting && meeting >= first && meeting <= endDt) {
        keys.push(toDateKey(meeting));
      }
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return keys;
  }

  return [startDate];
}

export const WEEKDAY_LABELS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];
