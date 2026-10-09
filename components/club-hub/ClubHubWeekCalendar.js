"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { fetchClubEventsInRange, groupEventsByDate } from "@/lib/club-hub/clubEvents";
import {
  LCPS_CALENDAR_SCHOOL_YEAR_LABEL,
  mergeLcpsDaysIntoEventsByDate,
} from "@/lib/club-hub/lcpsSchoolCalendar2026";
import {
  getSpartanDayHighlightKind,
  mergeSpartanScheduleIntoEventsByDate,
  SPARTAN_SCHEDULE_LABEL,
} from "@/lib/club-hub/spartanAdvisoryClubSchedule2026";
import ClubHubCalendarDayDetailDialog from "@/components/club-hub/ClubHubCalendarDayDetailDialog";
import { clubHubButtonFocusClass } from "@/lib/club-hub/a11y";

const RED = "#5c1417";

const NO_SCHOOL_DAY_CELL =
  "relative overflow-hidden border-2 border-dashed border-neutral-400 bg-white hover:bg-neutral-50";

const NO_SCHOOL_EVENT_BOX =
  "mx-1.5 my-1 rounded-lg border border-neutral-400 bg-white/95 px-2 py-2.5 text-center shadow-sm";

const NO_SCHOOL_CHIP =
  "truncate rounded-md bg-white/95 px-1 py-0.5 text-[9px] font-semibold leading-tight text-neutral-800 shadow-sm ring-1 ring-neutral-300 sm:text-[10px]";

/** @param {import("@/lib/club-hub/clubEvents.js").CalendarEventBlock[]} list */
function hasNoSchoolDay(list) {
  return list.some((e) => e.isLcpsNoSchool);
}

function NoSchoolCellOverlay() {
  const patternId = `lcps-no-school-${useId().replace(/:/g, "")}`;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[1] h-full w-full text-neutral-600"
      aria-hidden
      preserveAspectRatio="none"
    >
      <defs>
        <pattern
          id={patternId}
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-45)"
        >
          <line
            x1="8"
            y1="-10"
            x2="8"
            y2="26"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="6 8"
            strokeLinecap="round"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} opacity="0.55" />
    </svg>
  );
}

function startOfWeekSunday(d) {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d, n) {
  const x = new Date(d.getFullYear(), d.getMonth() + n, 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function fmtRange(weekStart) {
  const end = addDays(weekStart, 6);
  const left = weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const right = end.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `${left} - ${right}`;
}

function fmtMonthYear(d) {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sameDay(a, b) {
  return dateKey(a) === dateKey(b);
}

/** @param {Date} day @param {Date} start @param {Date} end */
function dayInRange(day, start, end) {
  const k = dateKey(day);
  return k >= dateKey(start) && k <= dateKey(end);
}

/** @param {Date} rangeStart @param {Date} rangeEnd @returns {Date | null} */
function selectedDayAfterNav(rangeStart, rangeEnd) {
  const today = todayStart();
  if (dayInRange(today, rangeStart, rangeEnd)) return today;
  return null;
}

/** @param {Date} focus @returns {Date | null} */
function selectionForWeekFocus(focus) {
  const weekStart = startOfWeekSunday(focus);
  return selectedDayAfterNav(weekStart, addDays(weekStart, 6));
}

/** @param {Date} focus @returns {Date | null} */
function selectionForMonthFocus(focus) {
  const y = focus.getFullYear();
  const m = focus.getMonth();
  return selectedDayAfterNav(new Date(y, m, 1), new Date(y, m, daysInMonth(y, m)));
}

function todayStart() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

const shortDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ChevronLeft() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
    </svg>
  );
}

function scheduleStyles(kind) {
  switch (kind) {
    case "advisory":
      return {
        box: "mx-1.5 my-1 rounded-lg border-2 border-sky-400 bg-sky-100 px-2 py-2.5 text-center shadow-sm",
        chip: "truncate rounded-md border border-sky-400 bg-sky-100 px-1 py-0.5 text-[9px] font-semibold leading-tight text-sky-950 sm:text-[10px]",
        dayCell: "bg-sky-100/85 hover:bg-sky-100",
        dayBadge: "bg-sky-600 text-white",
        time: "text-[12px] font-semibold leading-tight text-sky-900",
        title: "mt-0.5 text-[13px] font-bold leading-snug text-sky-950",
        loc: "mt-0.5 text-[10px] font-medium leading-snug text-sky-800",
        note: "mt-1 text-[9px] leading-snug text-sky-900",
      };
    case "gold":
      return {
        box: "mx-1.5 my-1 rounded-lg border-2 border-amber-500 bg-amber-100 px-2 py-2.5 text-center shadow-sm",
        chip: "truncate rounded-md border border-amber-500 bg-amber-100 px-1 py-0.5 text-[9px] font-semibold leading-tight text-amber-950 sm:text-[10px]",
        dayCell: "bg-amber-100/90 hover:bg-amber-100",
        dayBadge: "bg-amber-600 text-white",
        time: "text-[12px] font-semibold leading-tight text-amber-950",
        title: "mt-0.5 text-[13px] font-bold leading-snug text-amber-950",
        loc: "mt-0.5 text-[10px] font-medium leading-snug text-amber-900",
        note: "mt-1 text-[9px] leading-snug text-amber-950",
      };
    case "maroon":
      return {
        box: "mx-1.5 my-1 rounded-lg border-2 border-[#5c1417] bg-rose-100 px-2 py-2.5 text-center shadow-sm",
        chip: "truncate rounded-md border border-[#5c1417] bg-rose-100 px-1 py-0.5 text-[9px] font-semibold leading-tight text-[#5c1417] sm:text-[10px]",
        dayCell:
          "border border-[#5c1417]/25 bg-rose-100/95 hover:bg-rose-100",
        dayBadge: "bg-[#5c1417] text-white",
        time: "text-[12px] font-semibold leading-tight text-[#5c1417]",
        title: "mt-0.5 text-[13px] font-bold leading-snug text-[#5c1417]",
        loc: "mt-0.5 text-[10px] font-medium leading-snug text-[#731a1f]",
        note: "mt-1 text-[9px] leading-snug text-[#5c1417]",
      };
    case "planned":
      return {
        box: "mx-1.5 my-1 rounded-lg border-2 border-yellow-500 bg-yellow-100 px-2 py-2.5 text-center shadow-sm",
        chip: "truncate rounded-md border border-yellow-500 bg-yellow-100 px-1 py-0.5 text-[9px] font-semibold leading-tight text-yellow-950 sm:text-[10px]",
        dayCell: "bg-yellow-50/90 hover:bg-yellow-50",
        dayBadge: "bg-yellow-600 text-white",
        time: "text-[12px] font-semibold leading-tight text-yellow-950",
        title: "mt-0.5 text-[13px] font-bold leading-snug text-yellow-950",
        loc: "mt-0.5 text-[10px] font-medium leading-snug text-yellow-900",
        note: "mt-1 text-[9px] leading-snug text-yellow-950",
      };
    default:
      return null;
  }
}

/** @param {string} dateKey @param {import("@/lib/club-hub/clubEvents.js").CalendarEventBlock[]} list @param {boolean} selected */
function daySurfaceClass(dateKey, list, selected) {
  const highlight = getSpartanDayHighlightKind(dateKey);
  const styles = highlight ? scheduleStyles(highlight) : null;
  const hasNoSchool = hasNoSchoolDay(list);

  if (selected) {
    const base = hasNoSchool ? NO_SCHOOL_DAY_CELL : styles?.dayCell || "bg-white";
    return `${base} ring-2 ring-inset ring-[#5c1417]`;
  }
  if (hasNoSchool) return NO_SCHOOL_DAY_CELL;
  if (styles?.dayCell) return styles.dayCell;
  return "bg-white hover:bg-rose-50/40";
}

/** @param {string} dateKey @param {boolean} selected */
function dayNumberClass(dateKey, selected) {
  const highlight = getSpartanDayHighlightKind(dateKey);
  const styles = highlight ? scheduleStyles(highlight) : null;
  if (selected) return "bg-[#5c1417] text-white";
  if (styles?.dayBadge) return styles.dayBadge;
  return "text-neutral-900";
}

/** @param {import("@/lib/club-hub/clubEvents.js").CalendarEventBlock} ev */
function monthEventChipClass(ev) {
  const schedule = scheduleStyles(ev.scheduleKind);
  if (schedule?.chip) return schedule.chip;
  if (ev.isLcpsNoSchool) return NO_SCHOOL_CHIP;
  if (ev.isLcpsCalendar) {
    return "truncate rounded-md bg-slate-100 px-1 py-0.5 text-[9px] font-medium leading-tight text-slate-800 ring-1 ring-slate-300 sm:text-[10px]";
  }
  return "truncate rounded-md bg-neutral-100 px-1 py-0.5 text-[9px] font-medium leading-tight text-neutral-800 sm:text-[10px]";
}

function CalendarColorLegend() {
  const items = [
    { label: "Gold club day", className: "border-2 border-amber-500 bg-amber-100" },
    { label: "Maroon club day", className: "border-2 border-[#5c1417] bg-rose-100" },
    { label: "Advisory", className: "border-2 border-sky-400 bg-sky-100" },
    { label: "Planned event", className: "border-2 border-yellow-500 bg-yellow-100" },
    { label: "No school (LCPS)", hatch: true },
  ];
  return (
    <div
      className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-3 pb-3"
      aria-label="Calendar color key"
    >
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5 text-[11px] text-neutral-800 sm:text-xs">
          {"hatch" in item && item.hatch ? (
            <span
              className="relative h-3.5 w-3.5 shrink-0 overflow-hidden rounded-sm border-2 border-dashed border-neutral-400 bg-white"
              aria-hidden
            >
              <svg className="absolute inset-0 h-full w-full text-neutral-600" preserveAspectRatio="none">
                <defs>
                  <pattern
                    id="lcps-legend-dashes"
                    width="8"
                    height="8"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(-45)"
                  >
                    <line
                      x1="4"
                      y1="-4"
                      x2="4"
                      y2="12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="3 4"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#lcps-legend-dashes)" opacity="0.65" />
              </svg>
            </span>
          ) : (
            <span className={`h-3.5 w-3.5 shrink-0 rounded-sm ${item.className}`} aria-hidden />
          )}
          {item.label}
        </span>
      ))}
    </div>
  );
}

function EventBlock({ ev, isSelectedCol }) {
  const schedule = scheduleStyles(ev.scheduleKind);
  const lcpsNoSchool = ev.isLcpsNoSchool;
  const lcpsInfo = ev.isLcpsCalendar && !lcpsNoSchool;
  const accent = !schedule && !lcpsNoSchool && !lcpsInfo && ev.variant === "accent";
  const hi = !schedule && !lcpsNoSchool && !lcpsInfo && ev.highlight;

  let box =
    "mx-2 my-1 rounded-md border border-neutral-200 bg-neutral-100 px-1.5 py-2 text-center";
  if (lcpsNoSchool) {
    box = NO_SCHOOL_EVENT_BOX;
  } else if (lcpsInfo) {
    box =
      "mx-1.5 my-1 rounded-lg border border-slate-300 bg-slate-100 px-2 py-2 text-center text-slate-900 shadow-sm";
  } else if (schedule) {
    box = schedule.box;
  } else if (accent) {
    box = "mx-2 my-1 rounded-md border border-rose-300 bg-rose-50 px-1.5 py-2 text-center";
  } else if (hi) {
    box = "mx-2 my-1 rounded-md border-2 border-neutral-900 bg-white px-1.5 py-2 text-center";
  } else if (isSelectedCol) {
    box = "mx-2 my-1 rounded-md border border-neutral-200 bg-white px-1.5 py-2 text-center";
  }

  const timeCls = lcpsNoSchool
    ? "text-[12px] font-semibold leading-tight text-neutral-700"
    : lcpsInfo
      ? "text-[12px] font-medium leading-tight text-slate-700"
      : schedule
      ? schedule.time
      : accent
        ? "text-[12px] font-normal leading-tight text-rose-900"
        : "text-[12px] font-normal leading-tight text-neutral-800";
  const titleCls = lcpsNoSchool
    ? "mt-0.5 text-[13px] font-bold leading-snug text-neutral-900"
    : lcpsInfo
      ? "mt-0.5 text-[13px] font-semibold leading-snug text-slate-900"
      : schedule
      ? schedule.title
      : accent
        ? "mt-0.5 text-[12px] font-bold leading-snug text-rose-950"
        : "mt-0.5 text-[12px] font-bold leading-snug text-neutral-900";
  const locCls = lcpsNoSchool
    ? "mt-0.5 text-[10px] font-medium leading-snug text-neutral-600"
    : lcpsInfo
      ? "mt-0.5 text-[10px] leading-snug text-slate-600"
      : schedule
      ? schedule.loc
      : accent
        ? "mt-0.5 text-[10px] leading-snug text-rose-800"
        : "mt-0.5 text-[10px] leading-snug text-neutral-700";
  const noteCls = lcpsNoSchool
    ? "mt-1 text-[9px] leading-snug text-neutral-600"
    : lcpsInfo
      ? "mt-1 text-[9px] leading-snug text-slate-600"
      : schedule
      ? schedule.note
      : "mt-1 text-[9px] leading-snug text-rose-950";

  return (
    <div className={box}>
      <p className={timeCls}>{ev.time}</p>
      <p className={titleCls}>{ev.title}</p>
      <p className={locCls}>{ev.location}</p>
      {ev.note ? <p className={noteCls}>{ev.note}</p> : null}
    </div>
  );
}

function MonthView({ year, month, selectedDay, onDayClick, eventsByDate }) {
  const firstOfMonth = new Date(year, month, 1);
  const startPad = firstOfMonth.getDay();
  const totalDays = daysInMonth(year, month);
  const cells = [];

  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedKey = selectedDay ? dateKey(selectedDay) : "";

  return (
    <div className="border-t border-[#5c1417]/30 bg-white">
      <div className="grid grid-cols-7 border-b border-neutral-200">
        {shortDay.map((d) => (
          <div
            key={d}
            className="border-r border-neutral-200 py-2 text-center text-[11px] font-semibold text-[#5c1417] last:border-r-0 sm:text-xs"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-[minmax(88px,1fr)] sm:auto-rows-[minmax(110px,1fr)]">
        {cells.map((day, i) => {
          if (!day) {
            return (
              <div
                key={`empty-${i}`}
                className="border-b border-r border-neutral-300 bg-neutral-200/75 last:border-r-0"
                aria-hidden
              />
            );
          }
          const key = dateKey(day);
          const list = eventsByDate[key] || [];
          const selected = key === selectedKey;
          const noSchool = hasNoSchoolDay(list);

          const dayLabel = day.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          });

          return (
            <button
              key={key}
              type="button"
              onClick={() => onDayClick(day)}
              aria-label={`${dayLabel}${list.length ? `, ${list.length} event${list.length === 1 ? "" : "s"}` : ""}. Open day details.`}
              aria-pressed={selected}
              className={`flex min-h-0 flex-col border-b border-r border-neutral-200 p-1 text-left transition-colors last:border-r-0 sm:p-1.5 ${clubHubButtonFocusClass} ${daySurfaceClass(key, list, selected)}`}
            >
              {noSchool ? <NoSchoolCellOverlay /> : null}
              <span
                className={`relative z-[2] mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold sm:text-xs ${dayNumberClass(key, selected)}`}
              >
                {day.getDate()}
              </span>
              <div className="relative z-[2] min-h-0 flex-1 space-y-0.5 overflow-hidden">
                {list.slice(0, 3).map((ev, idx) => (
                  <p
                    key={`${key}-${idx}`}
                    className={monthEventChipClass(ev)}
                    title={ev.clubName ? `${ev.clubName}: ${ev.title}` : ev.title}
                  >
                    {ev.clubName && ev.clubName !== ev.title
                      ? `${ev.clubName}: ${ev.title}`
                      : ev.title}
                  </p>
                ))}
                {list.length > 3 ? (
                  <p className="px-1 text-[9px] font-semibold text-[#5c1417]">
                    +{list.length - 3} more — open day
                  </p>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ClubHubWeekCalendar() {
  const [view, setView] = useState("week");
  const [focusDate, setFocusDate] = useState(todayStart);
  /** @type {[Date | null, import("react").Dispatch<import("react").SetStateAction<Date | null>>]} */
  const [selectedDay, setSelectedDay] = useState(() => todayStart());
  const [eventsByDate, setEventsByDate] = useState({});
  const [detailDay, setDetailDay] = useState(null);

  const handleDayClick = (day) => {
    setSelectedDay(day);
    setFocusDate(day);
    setDetailDay(day);
  };

  const detailDayKey = detailDay ? dateKey(detailDay) : "";
  const detailEvents = detailDayKey ? eventsByDate[detailDayKey] || [] : [];

  const weekStart = useMemo(() => startOfWeekSunday(focusDate), [focusDate]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const visibleRange = useMemo(() => {
    if (view === "week") {
      return {
        start: dateKey(weekStart),
        end: dateKey(addDays(weekStart, 6)),
      };
    }
    const year = focusDate.getFullYear();
    const month = focusDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startPad = firstOfMonth.getDay();
    const gridStart = addDays(firstOfMonth, -startPad);
    const totalDays = daysInMonth(year, month);
    const lastDay = new Date(year, month, totalDays);
    const cellsCount = startPad + totalDays;
    const trailing = (7 - (cellsCount % 7)) % 7;
    const gridEnd = addDays(lastDay, trailing);
    return { start: dateKey(gridStart), end: dateKey(gridEnd) };
  }, [view, focusDate, weekStart]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const events = await fetchClubEventsInRange(visibleRange.start, visibleRange.end);
        if (!cancelled) {
          const grouped = groupEventsByDate(events);
          const withSchool = mergeSpartanScheduleIntoEventsByDate(
            grouped,
            visibleRange.start,
            visibleRange.end,
          );
          setEventsByDate(
            mergeLcpsDaysIntoEventsByDate(withSchool, visibleRange.start, visibleRange.end),
          );
        }
      } catch {
        if (!cancelled) setEventsByDate({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visibleRange.start, visibleRange.end]);

  const selectedIndex = selectedDay
    ? days.findIndex((d) => sameDay(d, selectedDay))
    : -1;

  const goPrev = () => {
    if (view === "week") {
      const nextFocus = addDays(weekStart, -7);
      setFocusDate(nextFocus);
      setSelectedDay(selectionForWeekFocus(nextFocus));
    } else {
      const nextFocus = addMonths(focusDate, -1);
      setFocusDate(nextFocus);
      setSelectedDay(selectionForMonthFocus(nextFocus));
    }
  };

  const goNext = () => {
    if (view === "week") {
      const nextFocus = addDays(weekStart, 7);
      setFocusDate(nextFocus);
      setSelectedDay(selectionForWeekFocus(nextFocus));
    } else {
      const nextFocus = addMonths(focusDate, 1);
      setFocusDate(nextFocus);
      setSelectedDay(selectionForMonthFocus(nextFocus));
    }
  };

  const navBtn =
    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5c1417] text-white transition-colors hover:bg-[#731a1f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c1417] focus-visible:ring-offset-1 sm:h-9 sm:w-9";

  const toggleBtn = (active) =>
    `${active
      ? "rounded-full border border-[#5c1417] bg-[#5c1417] px-5 py-1.5 text-sm font-semibold text-white shadow-sm"
      : "rounded-full border border-[#5c1417]/40 bg-white px-5 py-1.5 text-sm font-semibold text-[#5c1417] hover:bg-rose-50"} ${clubHubButtonFocusClass}`;

  const headerLabel = view === "month" ? fmtMonthYear(focusDate) : fmtRange(weekStart);

  return (
    <section className="w-full" aria-labelledby="club-hub-calendar-heading">
      <div className="border-b border-neutral-200 bg-white shadow-sm">
        <div
          className="flex min-h-[72px] items-center justify-center px-4 py-3 sm:min-h-[80px] sm:py-3.5"
          style={{
            backgroundColor: RED,
            backgroundImage:
              "linear-gradient(rgba(92,20,23,0.82), rgba(92,20,23,0.88)), url(/brand/brh.png)",
            backgroundSize: "cover",
            backgroundPosition: "center top",
          }}
        >
          <h2
            id="club-hub-calendar-heading"
            className="text-center font-black leading-none tracking-tight text-white drop-shadow-sm sm:drop-shadow md:tracking-tight"
          >
            <span className="block text-[clamp(2.25rem,5.5vw,3.5rem)]">Calendar</span>
          </h2>
        </div>

        <div className="bg-white px-2 pt-4 pb-0 sm:px-4 sm:pt-5">
          <div className="relative mb-3 flex items-center justify-center sm:mb-4">
            <button
              type="button"
              aria-label={view === "week" ? "Previous week" : "Previous month"}
              onClick={goPrev}
              className={`${navBtn} absolute left-0 top-1/2 z-10 -translate-y-1/2 sm:left-2`}
            >
              <ChevronLeft />
            </button>
            <p className="mx-auto max-w-[calc(100%-5.5rem)] px-10 text-center text-xl font-bold leading-snug text-[#5c1417] sm:max-w-none sm:px-14 sm:text-2xl md:text-[1.75rem]">
              {headerLabel}
            </p>
            <button
              type="button"
              aria-label={view === "week" ? "Next week" : "Next month"}
              onClick={goNext}
              className={`${navBtn} absolute right-0 top-1/2 z-10 -translate-y-1/2 sm:right-2`}
            >
              <ChevronRight />
            </button>
          </div>

          <div className="h-0.5 w-full bg-[#5c1417]" aria-hidden />

          <div className="flex flex-col items-center gap-2 px-3 py-3 sm:py-3.5">
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setView("week");
                  setSelectedDay(selectionForWeekFocus(focusDate));
                }}
                className={toggleBtn(view === "week")}
                aria-pressed={view === "week"}
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => {
                  setView("month");
                  setSelectedDay(selectionForMonthFocus(focusDate));
                }}
                className={toggleBtn(view === "month")}
                aria-pressed={view === "month"}
              >
                Month
              </button>
            </div>
            <p className="max-w-xl text-center text-[11px] leading-relaxed text-neutral-600 sm:text-xs">
              Includes {LCPS_CALENDAR_SCHOOL_YEAR_LABEL} holidays and breaks, plus{" "}
              {SPARTAN_SCHEDULE_LABEL}.
            </p>
            <CalendarColorLegend />
          </div>
        </div>

        <div className="bg-white">
          {view === "month" ? (
            <MonthView
              year={focusDate.getFullYear()}
              month={focusDate.getMonth()}
              selectedDay={selectedDay}
              eventsByDate={eventsByDate}
              onDayClick={handleDayClick}
            />
          ) : (
            <>
              <div className="hidden lg:block">
                <div className="grid grid-cols-7 border-t border-neutral-200">
                  {days.map((day, colIdx) => (
                    <div
                      key={`dow-${dateKey(day)}`}
                      className="border-r border-neutral-200 py-2 text-center text-[11px] font-semibold text-[#5c1417] last:border-r-0 sm:text-xs"
                    >
                      {shortDay[colIdx]}
                    </div>
                  ))}
                </div>
                <div className="grid h-[640px] grid-cols-7 gap-0 border-t border-neutral-200">
                  {days.map((day, colIdx) => {
                    const key = dateKey(day);
                    const list = eventsByDate[key] || [];
                    const noSchool = hasNoSchoolDay(list);
                    const isSelected = selectedIndex >= 0 && colIdx === selectedIndex;
                    const dateStr = day.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });

                    const dayLabel = day.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    });

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleDayClick(day)}
                        aria-label={`${dayLabel}${list.length ? `, ${list.length} event${list.length === 1 ? "" : "s"}` : ""}. Open day details.`}
                        aria-pressed={isSelected}
                        className={`flex min-h-0 min-w-0 flex-col border-r border-neutral-200 text-left last:border-r-0 ${clubHubButtonFocusClass} ${daySurfaceClass(key, list, isSelected)}`}
                      >
                        {noSchool ? <NoSchoolCellOverlay /> : null}
                        <div className="relative z-[2] shrink-0 px-1 py-2.5 text-center">
                          <div
                            className={`inline-block rounded-md px-2 py-1 text-sm font-bold leading-none sm:text-[15px] ${
                              isSelected
                                ? "bg-[#5c1417] text-white"
                                : getSpartanDayHighlightKind(key)
                                  ? `${dayNumberClass(key, false)} rounded-md px-2.5 py-1`
                                  : "text-[#5c1417]"
                            }`}
                          >
                            {dateStr}
                          </div>
                        </div>

                        <div className="relative z-[2] min-h-0 flex-1 overflow-y-auto pt-1">
                          {list.length === 0 ? (
                            <p className="py-6 text-center text-[10px] text-neutral-700">No events</p>
                          ) : (
                            list.map((ev, i) => (
                              <EventBlock key={`${key}-${i}`} ev={ev} isSelectedCol={isSelected} />
                            ))
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-0 divide-y divide-neutral-200 border-t border-neutral-200 lg:hidden">
                {days.map((day) => {
                  const key = dateKey(day);
                  const list = eventsByDate[key] || [];
                  const noSchool = hasNoSchoolDay(list);
                  const isSelected = selectedDay ? sameDay(day, selectedDay) : false;
                  const dateStr = day.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  });

                  return (
                    <div key={key} className="relative bg-white">
                      <button
                        type="button"
                        onClick={() => handleDayClick(day)}
                        aria-expanded={isSelected}
                        aria-controls={`${key}-events`}
                        aria-label={`${dateStr}. Open day details.`}
                        className={`relative flex w-full items-center justify-between overflow-hidden px-3 py-2.5 text-left ${clubHubButtonFocusClass} ${
                          isSelected ? "bg-[#5c1417]" : daySurfaceClass(key, list, false)
                        }`}
                      >
                        {!isSelected && noSchool ? <NoSchoolCellOverlay /> : null}
                        <span
                          className={`relative z-[2] rounded-md px-2 py-0.5 text-sm font-semibold ${
                            isSelected
                              ? "text-white"
                              : getSpartanDayHighlightKind(key)
                                ? dayNumberClass(key, false)
                                : "text-[#5c1417]"
                          }`}
                        >
                          {dateStr}
                        </span>
                      </button>
                      <div
                        id={`${key}-events`}
                        className={`relative space-y-0 overflow-hidden py-1 ${daySurfaceClass(key, list, false)}`}
                      >
                        {noSchool ? <NoSchoolCellOverlay /> : null}
                        <div className="relative z-[2]">
                          {list.length === 0 ? (
                            <p className="py-4 text-center text-[10px] text-neutral-700">No events</p>
                          ) : (
                            list.map((ev, i) => (
                              <EventBlock
                                key={`${key}-m-${i}`}
                                ev={ev}
                                isSelectedCol={isSelected}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <ClubHubCalendarDayDetailDialog
        day={detailDay}
        events={detailEvents}
        onClose={() => setDetailDay(null)}
        renderEvent={(ev, index) => (
          <EventBlock key={`detail-${index}`} ev={ev} isSelectedCol={false} />
        )}
      />
    </section>
  );
}
