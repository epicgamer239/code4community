"use client";

import { useMemo, useState } from "react";

const RED = "#5c1417";

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

const DEMO_EVENTS = {
  "2026-08-03": [
    { time: "3:15 PM", title: "Chess Club", location: "Library" },
    { time: "3:15 PM", title: "Book Club", location: "Room 204" },
  ],
  "2026-08-04": [
    { time: "12:00 PM", title: "Gender-Sexuality Alliance", location: "LLC 304/305" },
    { time: "3:15 PM", title: "Debate & Speech Team", location: "Room 112" },
    { time: "3:15 PM", title: "Competitive Math Union", location: "RH 200" },
  ],
  "2026-08-05": [
    { time: "3:15 PM", title: "Robotics", location: "Maker Lab" },
    { time: "3:15 PM", title: "Code4Community", location: "Room 210" },
  ],
  "2026-08-06": [
    { time: "12:30 PM", title: "Key Club", location: "Cafeteria" },
    { time: "3:15 PM", title: "DECA", location: "Business Wing" },
  ],
  "2026-08-07": [
    { time: "3:15 PM", title: "National Honor Society (NHS)", location: "Library" },
    { time: "3:15 PM", title: "American Cancer Society", location: "Room 118" },
  ],
  "2026-08-10": [
    { time: "3:15 PM", title: "Baking Club", location: "Foods Lab" },
    { time: "3:15 PM", title: "Anime Club", location: "Room 156" },
  ],
  "2026-08-12": [
    { time: "3:15 PM", title: "Science Olympiad", location: "Science Wing" },
    { time: "3:15 PM", title: "Girls Who Code", location: "Computer Lab" },
  ],
  "2026-08-14": [
    { time: "12:00 PM", title: "Student Council Association (SCA)", location: "Main Office Conference" },
    { time: "3:15 PM", title: "Future Business Leaders of America (FBLA)", location: "Room 230" },
  ],
  "2026-08-18": [
    { time: "3:15 PM", title: "Asian Student Association (ASA)", location: "Room 142" },
    { time: "3:15 PM", title: "PEER", location: "Counseling Suite" },
  ],
  "2026-08-21": [
    { time: "3:15 PM", title: "Interact", location: "Room 108" },
    { time: "3:15 PM", title: "Best Buddies", location: "Room 119" },
  ],
  "2026-08-25": [
    { time: "3:15 PM", title: "Robotics", location: "Maker Lab" },
    { time: "3:15 PM", title: "Technology Student Association (TSA)", location: "Tech Lab" },
  ],
  "2026-08-28": [
    { time: "12:00 PM", title: "Spirit of Spartans (SOS) / Unified Sports", location: "Main Gym" },
    { time: "3:15 PM", title: "Hiking Club", location: "Front Circle" },
  ],
};

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

function EventBlock({ ev, isSelectedCol }) {
  const accent = ev.variant === "accent";
  const hi = ev.highlight;

  let box =
    "mx-2 my-1 rounded-md border border-neutral-200 bg-neutral-100 px-1.5 py-2 text-center";
  if (accent) {
    box = "mx-2 my-1 rounded-md border border-rose-300 bg-rose-50 px-1.5 py-2 text-center";
  } else if (hi) {
    box = "mx-2 my-1 rounded-md border-2 border-neutral-900 bg-white px-1.5 py-2 text-center";
  } else if (isSelectedCol) {
    box = "mx-2 my-1 rounded-md border border-neutral-200 bg-white px-1.5 py-2 text-center";
  }

  const timeCls = accent
    ? "text-[12px] font-normal leading-tight text-rose-900"
    : "text-[12px] font-normal leading-tight text-neutral-800";
  const titleCls = accent
    ? "mt-0.5 text-[12px] font-bold leading-snug text-rose-950"
    : "mt-0.5 text-[12px] font-bold leading-snug text-neutral-900";
  const locCls = accent
    ? "mt-0.5 text-[10px] leading-snug text-rose-800"
    : "mt-0.5 text-[10px] leading-snug text-neutral-600";
  const noteCls = "mt-1 text-[9px] leading-snug text-rose-900/90";

  return (
    <div className={box}>
      <p className={timeCls}>{ev.time}</p>
      <p className={titleCls}>{ev.title}</p>
      <p className={locCls}>{ev.location}</p>
      {ev.note ? <p className={noteCls}>{ev.note}</p> : null}
    </div>
  );
}

function MonthView({ year, month, selectedDay, onSelectDay }) {
  const firstOfMonth = new Date(year, month, 1);
  const startPad = firstOfMonth.getDay();
  const totalDays = daysInMonth(year, month);
  const cells = [];

  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedKey = dateKey(selectedDay);

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
                className="border-b border-r border-neutral-200 bg-neutral-50/60 last:border-r-0"
              />
            );
          }
          const key = dateKey(day);
          const list = DEMO_EVENTS[key] || [];
          const selected = key === selectedKey;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(day)}
              className={`flex min-h-0 flex-col border-b border-r border-neutral-200 p-1 text-left transition-colors last:border-r-0 hover:bg-rose-50/50 sm:p-1.5 ${
                selected ? "bg-[#5c1417]/[5%] ring-1 ring-inset ring-[#5c1417]" : "bg-white"
              }`}
            >
              <span
                className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold sm:text-xs ${
                  selected ? "bg-[#5c1417] text-white" : "text-neutral-900"
                }`}
              >
                {day.getDate()}
              </span>
              <div className="min-h-0 flex-1 space-y-0.5 overflow-hidden">
                {list.slice(0, 3).map((ev, idx) => (
                  <p
                    key={`${key}-${idx}`}
                    className="truncate rounded-sm bg-neutral-100 px-1 py-0.5 text-[9px] font-medium leading-tight text-neutral-800 sm:text-[10px]"
                  >
                    {ev.title}
                  </p>
                ))}
                {list.length > 3 ? (
                  <p className="px-1 text-[9px] text-neutral-500">+{list.length - 3} more</p>
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
  const [focusDate, setFocusDate] = useState(() => new Date(2026, 7, 3));
  const [selectedDay, setSelectedDay] = useState(() => new Date(2026, 7, 3));

  const weekStart = useMemo(() => startOfWeekSunday(focusDate), [focusDate]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const selectedIndex = days.findIndex((d) => sameDay(d, selectedDay));

  const goPrev = () => {
    if (view === "week") {
      const next = addDays(weekStart, -7);
      setFocusDate(next);
      setSelectedDay(next);
    } else {
      const next = addMonths(focusDate, -1);
      setFocusDate(next);
      setSelectedDay(next);
    }
  };

  const goNext = () => {
    if (view === "week") {
      const next = addDays(weekStart, 7);
      setFocusDate(next);
      setSelectedDay(next);
    } else {
      const next = addMonths(focusDate, 1);
      setFocusDate(next);
      setSelectedDay(next);
    }
  };

  const navBtn =
    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5c1417] text-white transition-colors hover:bg-[#731a1f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c1417] focus-visible:ring-offset-1 sm:h-9 sm:w-9";

  const toggleBtn = (active) =>
    active
      ? "rounded-full border border-[#5c1417] bg-[#5c1417] px-5 py-1.5 text-sm font-semibold text-white shadow-sm"
      : "rounded-full border border-[#5c1417]/40 bg-white px-5 py-1.5 text-sm font-semibold text-[#5c1417] hover:bg-rose-50";

  const headerLabel = view === "month" ? fmtMonthYear(focusDate) : fmtRange(weekStart);

  return (
    <div className="w-full">
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
          <h2 className="text-center font-black leading-none tracking-tight text-white drop-shadow-sm sm:drop-shadow md:tracking-tight">
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

          <div className="flex justify-center gap-2 px-3 py-3 sm:py-3.5">
            <button type="button" onClick={() => setView("week")} className={toggleBtn(view === "week")}>
              Week
            </button>
            <button
              type="button"
              onClick={() => setView("month")}
              className={toggleBtn(view === "month")}
            >
              Month
            </button>
          </div>
        </div>

        <div className="bg-white">
          {view === "month" ? (
            <MonthView
              year={focusDate.getFullYear()}
              month={focusDate.getMonth()}
              selectedDay={selectedDay}
              onSelectDay={(day) => {
                setSelectedDay(day);
                setFocusDate(day);
              }}
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
                    const list = DEMO_EVENTS[key] || [];
                    const isSelected = selectedIndex >= 0 && colIdx === selectedIndex;
                    const dateStr = day.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setSelectedDay(day);
                          setFocusDate(day);
                        }}
                        className="flex min-h-0 min-w-0 flex-col border-r border-neutral-200 bg-neutral-100/80 text-left last:border-r-0"
                      >
                        <div
                          className={`shrink-0 px-1 py-2.5 text-center ${
                            isSelected ? "bg-[#5c1417] text-white" : "bg-transparent"
                          }`}
                        >
                          <div
                            className={`text-sm font-semibold leading-none sm:text-[15px] ${
                              isSelected ? "text-white" : "text-[#5c1417]"
                            }`}
                          >
                            {dateStr}
                          </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto pt-1">
                          {list.length === 0 ? (
                            <p className="py-6 text-center text-[10px] text-neutral-400">No events</p>
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
                  const list = DEMO_EVENTS[key] || [];
                  const isSelected = sameDay(day, selectedDay);
                  const dateStr = day.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  });

                  return (
                    <div key={key} className="bg-white">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDay(day);
                          setFocusDate(day);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-2.5 text-left ${
                          isSelected ? "bg-[#5c1417]" : "bg-neutral-50"
                        }`}
                      >
                        <span
                          className={`text-sm font-semibold ${
                            isSelected ? "text-white" : "text-[#5c1417]"
                          }`}
                        >
                          {dateStr}
                        </span>
                      </button>
                      <div className="space-y-0 bg-neutral-100/80 py-1">
                        {list.length === 0 ? (
                          <p className="py-4 text-center text-[10px] text-neutral-400">No events</p>
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
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
