import { toDate } from "@/lib/mathlab/scheduler";

/** @param {Date} d */
export function toYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** @param {string} ymd */
export function ymdToDate(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** @param {Date} d */
export function formatLongWeekday(d) {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** @param {Date} d */
export function formatMonthYear(d) {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** @param {Date} d */
export function formatTime12h(d) {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** @param {{ startAt?: unknown }} slot */
export function slotStartDate(slot) {
  return toDate(slot?.startAt);
}

/** @param {{ startAt?: unknown }} slot */
export function slotYmd(slot) {
  const d = slotStartDate(slot);
  return d ? toYmd(d) : null;
}

/**
 * @param {number} year
 * @param {number} month 0-indexed
 * @returns {Array<{ date: Date | null, ymd: string | null, inMonth: boolean }>}
 */
export function getCalendarGrid(year, month) {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < startPad; i++) {
    cells.push({ date: null, ymd: null, inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    cells.push({ date, ymd: toYmd(date), inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, ymd: null, inMonth: false });
  }
  return cells;
}

/** @param {string} ymd @param {Set<string>} available */
export function isDayAvailable(ymd, available) {
  return available.has(ymd);
}

/** @param {string} a @param {string} b */
export function compareYmd(a, b) {
  return a.localeCompare(b);
}

/** @param {string} ymd */
export function isPastYmd(ymd) {
  return compareYmd(ymd, toYmd(new Date())) < 0;
}

/** @param {string} time24 "HH:MM" */
export function parseTime24OnYmd(ymd, time24) {
  return new Date(`${ymd}T${time24}`);
}

/** @param {Date} d */
export function addMinutes(d, mins) {
  return new Date(d.getTime() + mins * 60 * 1000);
}

/** Default slot length when teacher picks a start time only */
export const DEFAULT_SLOT_MINUTES = 30;

/** @param {string} time24 */
export function formatTime24As12h(time24) {
  const d = parseTime24OnYmd("2000-01-01", time24);
  return formatTime12h(d);
}

/** @param {object[]} slots @param {string} ymd */
export function slotsForDay(slots, ymd) {
  return slots
    .filter((s) => slotYmd(s) === ymd)
    .sort((a, b) => {
      const da = slotStartDate(a)?.getTime() ?? 0;
      const db = slotStartDate(b)?.getTime() ?? 0;
      return da - db;
    });
}

/** @param {object[]} slots */
export function availableYmdsFromSlots(slots) {
  const set = new Set();
  for (const s of slots) {
    const y = slotYmd(s);
    if (y && !isPastYmd(y)) set.add(y);
  }
  return set;
}

/** @param {string} ymd */
export function firstAvailableYmd(slots, preferredYmd) {
  const available = availableYmdsFromSlots(slots);
  if (preferredYmd && available.has(preferredYmd)) return preferredYmd;
  const sorted = [...available].sort(compareYmd);
  return sorted[0] || toYmd(new Date());
}

/** @param {string} hhmm */
export function isValidTime24(hhmm) {
  return /^\d{2}:\d{2}$/.test(hhmm);
}

/** @param {string} a @param {string} b */
export function time24ToMinutes(a) {
  const [h, m] = a.split(":").map(Number);
  return h * 60 + m;
}

/** @param {object[]} daySlots @param {string} startTime */
export function hasTimeConflict(daySlots, startTime, durationMin = DEFAULT_SLOT_MINUTES) {
  const start = time24ToMinutes(startTime);
  const end = start + durationMin;
  for (const slot of daySlots) {
    const d = slotStartDate(slot);
    if (!d) continue;
    const s = d.getHours() * 60 + d.getMinutes();
    const e = slot.endAt?.toDate
      ? slot.endAt.toDate().getHours() * 60 + slot.endAt.toDate().getMinutes()
      : s + durationMin;
    if (start < e && end > s) return true;
  }
  return false;
}

/** @param {number} mins */
export function minutesToTime24(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Quick-pick times for teachers */
export const TEACHER_TIME_PRESETS = [
  "08:30",
  "08:45",
  "16:30",
  "17:00",
];
