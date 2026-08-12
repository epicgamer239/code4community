/** Math Lab scheduled tutoring requests (fixed start times). */

export const REQUEST_TYPE_NOW = "now";
export const REQUEST_TYPE_SCHEDULED = "scheduled";

/** Allowed start times as HH:mm (24h). 10-min steps; morning ends at 9:15. */
function buildAllowedScheduledTimes() {
  const times = [];
  const push = (totalMinutes) => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    times.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };

  // 7:00 – 9:10 every 10 minutes, plus latest start 9:15
  for (let t = 7 * 60; t <= 9 * 60 + 10; t += 10) push(t);
  push(9 * 60 + 15);

  // 4:20 – 6:00 every 10 minutes
  for (let t = 16 * 60 + 20; t <= 18 * 60; t += 10) push(t);

  return times;
}

export const ALLOWED_SCHEDULED_TIMES = buildAllowedScheduledTimes();

const ALLOWED_TIME_SET = new Set(ALLOWED_SCHEDULED_TIMES);

export function toLocalYmd(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
