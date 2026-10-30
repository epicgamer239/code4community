import { getLcpsDayInfo, isLcpsNoSchoolKind } from "@/lib/club-hub/lcpsSchoolCalendar2026";

/** @typedef {import("@/lib/club-hub/clubEvents.js").CalendarEventBlock} CalendarEventBlock */

export const SCHOOL_YEAR_FIRST_DAY = "2026-08-17";
export const SCHOOL_YEAR_LAST_DAY = "2027-06-11";
/** No Activity Bus during the final week of school (Mon–Fri). */
export const ACTIVITY_BUS_LAST_WEEK_START = "2027-06-07";

/**
 * Lower rank = higher on the calendar day.
 * @param {CalendarEventBlock} ev
 */
export function calendarEventSortRank(ev) {
  if (ev.isLcpsCalendar) {
    if (ev.lcpsKind === "end-quarter" || ev.lcpsKind === "school-milestone") return 0;
    if (ev.isLcpsNoSchool) return 2;
    return 1;
  }
  if (ev.isActivityBus) return 30;
  if (ev.isSpartanSchedule) {
    switch (ev.scheduleKind) {
      case "advisory":
        return 10;
      case "planned":
        return 11;
      case "gold":
        return 12;
      case "maroon":
        return 13;
      default:
        return 14;
    }
  }
  return 100;
}

/** @param {CalendarEventBlock} ev */
function calendarEventSortKey(ev) {
  const rank = calendarEventSortRank(ev);
  const title = (ev.title || "").toLowerCase();
  const time = ev.time || "";
  return `${String(rank).padStart(3, "0")}|${time}|${title}`;
}

/** @param {CalendarEventBlock[]} events */
export function sortCalendarDayEvents(events) {
  return [...events].sort((a, b) => calendarEventSortKey(a).localeCompare(calendarEventSortKey(b)));
}

/** @param {Record<string, CalendarEventBlock[]>} eventsByDate */
export function sortCalendarEventsByDateMap(eventsByDate) {
  /** @type {Record<string, CalendarEventBlock[]>} */
  const out = {};
  for (const [key, list] of Object.entries(eventsByDate)) {
    out[key] = sortCalendarDayEvents(list);
  }
  return out;
}

/** @param {string} dateKey YYYY-MM-DD */
export function isWednesdayDateKey(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).getDay() === 3;
}

/** @param {string} dateKey */
export function isLcpsSchoolDayInSession(dateKey) {
  if (dateKey < SCHOOL_YEAR_FIRST_DAY || dateKey > SCHOOL_YEAR_LAST_DAY) return false;
  const info = getLcpsDayInfo(dateKey);
  if (info && isLcpsNoSchoolKind(info.kind)) return false;
  return true;
}

/** @param {string} dateKey */
export function shouldShowActivityBus(dateKey) {
  if (!isWednesdayDateKey(dateKey)) return false;
  if (!isLcpsSchoolDayInSession(dateKey)) return false;
  if (dateKey >= ACTIVITY_BUS_LAST_WEEK_START && dateKey <= SCHOOL_YEAR_LAST_DAY) {
    return false;
  }
  return true;
}

/** @param {string} start @param {string} end */
function dateKeysInRange(start, end) {
  /** @type {string[]} */
  const keys = [];
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  let d = new Date(sy, sm - 1, sd);
  const last = new Date(ey, em - 1, ed);
  while (d <= last) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    keys.push(`${y}-${m}-${day}`);
    d.setDate(d.getDate() + 1);
  }
  return keys;
}

/**
 * @param {Record<string, CalendarEventBlock[]>} eventsByDate
 * @param {string} rangeStart
 * @param {string} rangeEnd
 */
export function mergeActivityBusWednesdays(eventsByDate, rangeStart, rangeEnd) {
  const out = { ...eventsByDate };
  for (const key of dateKeysInRange(rangeStart, rangeEnd)) {
    if (!shouldShowActivityBus(key)) continue;
    const block = {
      time: "5:30",
      title: "Activity Bus",
      location: "",
      note: "",
      description: "",
      clubName: "",
      clubSlug: "",
      eventId: "",
      isActivityBus: true,
    };
    out[key] = [...(out[key] || []), block];
  }
  return out;
}
