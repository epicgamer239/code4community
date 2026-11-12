/** Math Lab scheduled tutoring requests (fixed start times). */

import {
  TUTORING_TIME_ZONE,
  LIVE_REQUEST_EARLIEST_MINUTES,
  LIVE_REQUEST_LATEST_MINUTES,
  canSubmitLiveTutoringRequest,
  getEasternSchoolClock,
  liveTutoringRequestBlockReason,
} from "@/lib/tutoringLiveWindow";

export const REQUEST_TYPE_NOW = "now";
export const REQUEST_TYPE_SCHEDULED = "scheduled";

export {
  TUTORING_TIME_ZONE as MATHLAB_TIME_ZONE,
  LIVE_REQUEST_EARLIEST_MINUTES,
  LIVE_REQUEST_LATEST_MINUTES,
  getEasternSchoolClock as getMathLabEasternClock,
};

/** Allowed start times as HH:mm (24h). 10-min steps; morning 8:00–9:15, afternoon 4:20–5:30. */
function buildAllowedScheduledTimes() {
  const times = [];
  const push = (totalMinutes) => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    times.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };

  // 8:00 – 9:10 every 10 minutes, plus latest start 9:15
  for (let t = 8 * 60; t <= 9 * 60 + 10; t += 10) push(t);
  push(9 * 60 + 15);

  // 4:20 – 5:30 every 10 minutes
  for (let t = 16 * 60 + 20; t <= 17 * 60 + 30; t += 10) push(t);

  return times;
}

export const ALLOWED_SCHEDULED_TIMES = buildAllowedScheduledTimes();

const ALLOWED_TIME_SET = new Set(ALLOWED_SCHEDULED_TIMES);

export function toLocalYmd(date = new Date()) {
  return getEasternSchoolClock(date).ymd;
}

/** Calendar YMD is Monday–Friday. */
export function isWeekdayYmd(ymd) {
  if (typeof ymd !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return false;
  const day = dt.getDay();
  return day >= 1 && day <= 5;
}

/** Next weekday on or after ymd (skips Sat/Sun). */
export function nextWeekdayYmd(ymd = toLocalYmd()) {
  const start = /^\d{4}-\d{2}-\d{2}$/.test(String(ymd || "")) ? String(ymd) : toLocalYmd();
  const [y, m, d] = start.split("-").map(Number);
  for (let i = 0; i < 8; i += 1) {
    const candidate = new Date(y, m - 1, d + i);
    const cy = candidate.getFullYear();
    const cm = String(candidate.getMonth() + 1).padStart(2, "0");
    const cd = String(candidate.getDate()).padStart(2, "0");
    const key = `${cy}-${cm}-${cd}`;
    if (isWeekdayYmd(key)) return key;
  }
  return start;
}

export function isValidScheduledDate(ymd) {
  if (typeof ymd !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y &&
    dt.getMonth() === m - 1 &&
    dt.getDate() === d
  );
}

/** True when a live (“Now”) request may be submitted. */
export function canSubmitLiveMathLabRequest(now = new Date()) {
  return canSubmitLiveTutoringRequest(now);
}

/** User-facing reason live requests are blocked, or null when allowed. */
export function liveMathLabRequestBlockReason(now = new Date()) {
  return liveTutoringRequestBlockReason(now, { serviceLabel: "Live requests" });
}

/** True when a scheduled request may use this calendar date. */
export function canScheduleMathLabRequestOnDate(ymd, now = new Date()) {
  if (!isValidScheduledDate(ymd)) return false;
  if (!isWeekdayYmd(ymd)) return false;
  return ymd >= toLocalYmd(now);
}

export function scheduledMathLabDateBlockReason(ymd, now = new Date()) {
  if (!isValidScheduledDate(ymd)) return "Please choose a valid date.";
  if (!isWeekdayYmd(ymd)) return "Math Lab requests are only available Monday–Friday.";
  if (ymd < toLocalYmd(now)) return "Please choose today or a future weekday.";
  return null;
}

export function isValidScheduledTime(value) {
  return typeof value === "string" && ALLOWED_TIME_SET.has(value);
}

export function normalizeRequestType(value) {
  return value === REQUEST_TYPE_SCHEDULED ? REQUEST_TYPE_SCHEDULED : REQUEST_TYPE_NOW;
}

export function normalizeScheduledTime(value) {
  return isValidScheduledTime(value) ? value : null;
}

export function isScheduledRequest(request) {
  return normalizeRequestType(request?.requestType) === REQUEST_TYPE_SCHEDULED;
}

/** "7:00 AM", "4:20 PM" */
export function formatScheduledTimeLabel(hhmm) {
  if (!isValidScheduledTime(hhmm)) return hhmm || "";
  const [h, m] = hhmm.split(":").map(Number);
  const dt = new Date(2000, 0, 1, h, m);
  return dt.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** e.g. "Mon, Aug 12 · 4:20 PM" */
export function formatScheduleLabel(request) {
  if (!isScheduledRequest(request)) return null;
  const timeLabel = formatScheduledTimeLabel(request.scheduledTime);
  const ymd = request.scheduledDate;
  if (!isValidScheduledDate(ymd)) {
    return timeLabel || "Scheduled";
  }
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const dateLabel = dt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return timeLabel ? `${dateLabel} · ${timeLabel}` : dateLabel;
}

export function compareScheduledRequests(a, b) {
  const dateCmp = String(a?.scheduledDate || "").localeCompare(String(b?.scheduledDate || ""));
  if (dateCmp !== 0) return dateCmp;
  return String(a?.scheduledTime || "").localeCompare(String(b?.scheduledTime || ""));
}

/** Local Date for scheduledDate + scheduledTime, or null. */
export function getScheduledStartDate(request) {
  const ymd = request?.scheduledDate;
  const time = request?.scheduledTime;
  if (!isValidScheduledDate(ymd) || !isValidScheduledTime(time)) return null;
  const [y, mo, d] = ymd.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

export const SCHEDULED_START_EARLY_MINUTES = 15;

/** Tutors may start from 15 minutes before the scheduled start. */
export function canStartScheduledSession(request, now = new Date()) {
  const start = getScheduledStartDate(request);
  if (!start) return false;
  const unlockAt = new Date(start.getTime() - SCHEDULED_START_EARLY_MINUTES * 60 * 1000);
  return now >= unlockAt;
}

/** Pending scheduled requests expire once the start time has passed. */
export function isExpiredScheduledPending(request, now = new Date()) {
  if (!isScheduledRequest(request)) return false;
  if (request?.status && request.status !== "pending") return false;
  const start = getScheduledStartDate(request);
  if (!start) {
    const ymd = request?.scheduledDate;
    if (isValidScheduledDate(ymd)) return ymd < toLocalYmd(now);
    return false;
  }
  return start < now;
}
