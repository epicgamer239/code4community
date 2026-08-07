"use client";

import { useMemo, useState } from "react";
import {
  formatLongWeekday,
  formatMonthYear,
  getCalendarGrid,
  isDayAvailable,
  isPastYmd,
  toYmd,
} from "@/lib/mathlab/schedulerCalendar";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Calendly-style availability picker: calendar left, times/content right.
 */
export default function AvailabilityPicker({
  title = "Available times",
  availableYmds,
  selectedYmd,
  onSelectDay,
  viewMonth,
  onViewMonthChange,
  headerExtra,
  children,
  emptyDayMessage = "Select a highlighted day to see times.",
  requireAvailability = true,
}) {
  const todayYmd = toYmd(new Date());
  const grid = useMemo(
    () => getCalendarGrid(viewMonth.getFullYear(), viewMonth.getMonth()),
    [viewMonth]
  );

  const shiftMonth = (delta) => {
    onViewMonthChange(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1));
  };

  const selectedDate = selectedYmd ? new Date(selectedYmd + "T12:00:00") : null;
  const hasSelection = Boolean(selectedYmd);

  return (
    <div className="max-w-[720px] mx-auto bg-white border border-[#e1e1e1] rounded-md shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#e1e1e1]">
        <h2 className="text-[15px] font-semibold text-[#242424]">{title}</h2>
        {headerExtra}
      </div>

      <div className="flex flex-col sm:flex-row min-h-[360px]">
        <div className="sm:w-[280px] shrink-0 border-b sm:border-b-0 sm:border-r border-[#e1e1e1] p-4 pb-3">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-sm font-semibold text-[#242424]">{formatMonthYear(viewMonth)}</span>
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="p-0.5 text-[#616161] hover:text-[#242424]"
                aria-label="Previous month"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="p-0.5 text-[#616161] hover:text-[#242424]"
                aria-label="Next month"
              >
                ▼
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-0 text-center mb-1">
            {WEEKDAYS.map((d, i) => (
              <div key={i} className="text-[11px] font-medium text-[#616161] py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0">
            {grid.map((cell, i) => {
              if (!cell.date || !cell.ymd) {
                return <div key={i} className="h-9" />;
              }
              const available = isDayAvailable(cell.ymd, availableYmds);
              const isToday = cell.ymd === todayYmd;
              const isSelected = cell.ymd === selectedYmd;
              const past = isPastYmd(cell.ymd);
              const weekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;
              const disabled = weekend || past || (requireAvailability && !available);

              return (
                <button
                  key={cell.ymd}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectDay(cell.ymd)}
                  className={[
                    "h-9 w-9 mx-auto flex items-center justify-center text-sm rounded-md transition-colors relative",
                    disabled
                      ? requireAvailability && !past
                        ? "text-[#bdbdbd] cursor-default"
                        : past
                          ? "text-[#bdbdbd] cursor-default"
                            : weekend
                              ? "text-[#bdbdbd] cursor-default"
                              : "text-[#242424] hover:bg-[#f5f5f5] cursor-pointer"
                      : "text-[#242424] cursor-pointer hover:bg-[#f0f6fc]",
                    !disabled && available ? "font-semibold" : "",
                    isSelected && !past ? "bg-[#ebf3fc]" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {isToday && isSelected ? (
                    <span className="w-7 h-7 flex items-center justify-center rounded-full bg-[#0078d4] text-white text-sm">
                      {cell.date.getDate()}
                    </span>
                  ) : isToday ? (
                    <span className="w-7 h-7 flex items-center justify-center rounded-full border-2 border-[#0078d4] text-[#0078d4]">
                      {cell.date.getDate()}
                    </span>
                  ) : (
                    <>
                      {cell.date.getDate()}
                      {available && !past && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#0078d4]" />
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              const t = toYmd(new Date());
              onViewMonthChange(new Date());
              onSelectDay(t);
            }}
            className="mt-3 w-full text-center text-sm text-[#0078d4] hover:underline py-1"
          >
            Today
          </button>
        </div>

        <div className="flex-1 p-5 sm:p-6 min-w-0">
          {selectedDate && hasSelection ? (
            <>
              <p className="text-sm font-semibold text-[#242424] mb-4">
                {formatLongWeekday(selectedDate)}
              </p>
              {children}
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-[#616161] text-center px-4">
              {emptyDayMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function TimeSlotButton({ children, onClick, disabled, active, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "w-full py-3 px-4 text-sm font-medium rounded border transition-colors text-left",
        active
          ? "border-[#0078d4] bg-[#ebf3fc] text-[#0078d4]"
          : "border-[#c8c8c8] text-[#242424] hover:border-[#0078d4] hover:bg-[#fafafa]",
        disabled ? "opacity-50 cursor-not-allowed hover:border-[#c8c8c8] hover:bg-transparent" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}

export function FilterMenuButton({ open, onToggle, children }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`p-2 rounded-md border transition-colors ${
          open ? "border-[#0078d4] bg-[#ebf3fc] text-[#0078d4]" : "border-transparent text-[#616161] hover:bg-[#f5f5f5]"
        }`}
        aria-label="Filters"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M6 12h12M8 18h8" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={onToggle} aria-hidden />
          <div className="absolute right-0 top-full mt-1 z-20 w-56 bg-white border border-[#e1e1e1] rounded-md shadow-lg p-3 space-y-3">
            {children}
          </div>
        </>
      )}
    </div>
  );
}
