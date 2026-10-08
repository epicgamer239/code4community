/**
 * LCPS 2026–27 student calendar (Aug 17, 2026 – Jun 11, 2027).
 * Source: LCPS HRTD school calendar, approved Feb 2025.
 */

/** @typedef {{ label: string, kind: "holiday" | "student-holiday" | "break" | "end-quarter" | "school-milestone" }} LcpsDayInfo */

/** @param {LcpsDayInfo["kind"]} kind */
export function isLcpsNoSchoolKind(kind) {
  return kind === "holiday" || kind === "student-holiday" || kind === "break";
}

/** @param {string} start @param {string} end */
function expandRange(start, end) {
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

/** @type {Record<string, LcpsDayInfo>} */
const LCPS_DAY_MAP = {};

/** @param {string[]} dates @param {LcpsDayInfo} info */
function addDays(dates, info) {
  for (const key of dates) {
    LCPS_DAY_MAP[key] = info;
  }
}

addDays(["2026-08-17"], { label: "First day of school", kind: "school-milestone" });
addDays(["2026-09-04"], { label: "Student holiday", kind: "student-holiday" });
addDays(["2026-09-07"], { label: "Labor Day", kind: "holiday" });
addDays(["2026-09-21"], { label: "Yom Kippur", kind: "holiday" });
addDays(["2026-10-12"], { label: "Indigenous Peoples' Day", kind: "holiday" });
addDays(["2026-10-28"], { label: "End of quarter", kind: "end-quarter" });
addDays(["2026-10-29", "2026-10-30", "2026-11-02", "2026-11-03"], {
  label: "Student holiday",
  kind: "student-holiday",
});
addDays(["2026-11-09"], { label: "Diwali", kind: "holiday" });
addDays(expandRange("2026-11-25", "2026-11-27"), {
  label: "Thanksgiving break",
  kind: "break",
});
addDays(expandRange("2026-12-21", "2027-01-01"), {
  label: "Winter break",
  kind: "break",
});
addDays(["2027-01-18"], { label: "Martin Luther King Jr. Day", kind: "holiday" });
addDays(["2027-01-22"], { label: "End of quarter", kind: "end-quarter" });
addDays(["2027-01-25"], { label: "Student holiday", kind: "student-holiday" });
addDays(["2027-02-05"], { label: "Lunar New Year", kind: "holiday" });
addDays(["2027-02-15"], { label: "Presidents' Day", kind: "holiday" });
addDays(["2027-03-08"], { label: "Student holiday", kind: "student-holiday" });
addDays(["2027-03-09"], { label: "Eid al-Fitr", kind: "holiday" });
addDays(expandRange("2027-03-22", "2027-03-26"), {
  label: "Spring break",
  kind: "break",
});
addDays(["2027-04-09"], { label: "End of quarter", kind: "end-quarter" });
addDays(["2027-04-12"], { label: "Student holiday", kind: "student-holiday" });
addDays(["2027-05-31"], { label: "Memorial Day", kind: "holiday" });
addDays(["2027-06-11"], { label: "Last day of school", kind: "school-milestone" });

/** @param {string} dateKey YYYY-MM-DD */
export function getLcpsDayInfo(dateKey) {
  return LCPS_DAY_MAP[dateKey] || null;
}

/**
 * Merge LCPS no-school / break labels into calendar event map.
 *
 * @param {Record<string, import("./clubEvents.js").CalendarEventBlock[]>} eventsByDate
 * @param {string} rangeStart YYYY-MM-DD
 * @param {string} rangeEnd YYYY-MM-DD
 */
export function mergeLcpsDaysIntoEventsByDate(eventsByDate, rangeStart, rangeEnd) {
  const out = { ...eventsByDate };
  const [sy, sm, sd] = rangeStart.split("-").map(Number);
  const [ey, em, ed] = rangeEnd.split("-").map(Number);
  let d = new Date(sy, sm - 1, sd);
  const last = new Date(ey, em - 1, ed);

  while (d <= last) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${day}`;
    const info = getLcpsDayInfo(key);
    if (info) {
      const noSchool = isLcpsNoSchoolKind(info.kind);
      const block = {
        time: "All day",
        title: info.label,
        location: noSchool ? "No school" : "School in session",
        note: "LCPS calendar",
        description: "",
        clubName: "",
        clubSlug: "",
        eventId: "",
        variant: noSchool ? "accent" : undefined,
        highlight: info.kind === "break",
        isLcpsCalendar: true,
        isLcpsNoSchool: noSchool,
        lcpsKind: info.kind,
      };
      out[key] = [block, ...(out[key] || [])];
    }
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export const LCPS_CALENDAR_SCHOOL_YEAR_LABEL = "2026–27 LCPS";
