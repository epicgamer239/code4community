/** Shared live tutoring request windows (Math Lab + Writing Center). LCPS Eastern time. */

export const TUTORING_TIME_ZONE = "America/New_York";

/** Live requests: 9:30 AM–4:18 PM Eastern, weekdays only. */
export const LIVE_REQUEST_EARLIEST_MINUTES = 9 * 60 + 30;
export const LIVE_REQUEST_LATEST_MINUTES = 16 * 60 + 18;

/**
 * @param {Date} [date]
 * @returns {{ ymd: string, minutes: number, weekday: number }}
 * weekday: 0=Sun … 6=Sat in America/New_York
 */
export function getEasternSchoolClock(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TUTORING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(date);

  /** @type {Record<string, string>} */
  const map = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }

  const weekdayName = map.weekday || "";
  const weekdayByName = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const weekday = weekdayByName[weekdayName] ?? 0;
  const hour = Number(map.hour || 0);
  const minute = Number(map.minute || 0);
  return {
    ymd: `${map.year}-${map.month}-${map.day}`,
    minutes: hour * 60 + minute,
    weekday,
  };
}

/** True when a live in-person tutoring request may be submitted. */
export function canSubmitLiveTutoringRequest(now = new Date()) {
  const clock = getEasternSchoolClock(now);
  if (clock.weekday < 1 || clock.weekday > 5) return false;
  return (
    clock.minutes >= LIVE_REQUEST_EARLIEST_MINUTES &&
    clock.minutes <= LIVE_REQUEST_LATEST_MINUTES
  );
}

/**
 * @param {Date} [now]
 * @param {{ serviceLabel?: string }} [opts]
 */
export function liveTutoringRequestBlockReason(now = new Date(), opts = {}) {
  if (canSubmitLiveTutoringRequest(now)) return null;
  const label = opts.serviceLabel || "Live requests";
  const clock = getEasternSchoolClock(now);
  if (clock.weekday < 1 || clock.weekday > 5) {
    return `${label} are only available Monday–Friday.`;
  }
  return `${label} are only available weekdays from 9:30 AM to 4:18 PM.`;
}
