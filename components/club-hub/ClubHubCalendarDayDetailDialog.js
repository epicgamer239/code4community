"use client";

import { useEffect, useRef } from "react";
import { clubHubButtonFocusClass } from "@/lib/club-hub/a11y";

const MAROON = "#5c1417";

/**
 * @param {{
 *   day: Date | null,
 *   events: import("@/lib/club-hub/clubEvents.js").CalendarEventBlock[],
 *   onClose: () => void,
 *   renderEvent: (ev: import("@/lib/club-hub/clubEvents.js").CalendarEventBlock, index: number) => React.ReactNode,
 * }} props
 */
export default function ClubHubCalendarDayDetailDialog({ day, events, onClose, renderEvent }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!day) return undefined;
    closeButtonRef.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [day, onClose]);

  if (!day) return null;

  const title = day.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-day-detail-title"
        className="flex max-h-[min(88vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4">
          <div>
            <h2 id="calendar-day-detail-title" className="text-lg font-bold text-neutral-900">
              {title}
            </h2>
            <p className="mt-0.5 text-sm text-neutral-700">
              {events.length === 0
                ? "Nothing scheduled on this day."
                : `${events.length} item${events.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className={`shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 ${clubHubButtonFocusClass}`}
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {events.length === 0 ? (
            <p className="text-sm text-neutral-700">
              Club meetings, school events, and LCPS dates for this day will appear here when
              scheduled.
            </p>
          ) : (
            <ul className="space-y-3">
              {events.map((ev, index) => (
                <li key={`${ev.eventId || ev.title}-${index}`}>{renderEvent(ev, index)}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-neutral-200 px-5 py-3 sm:hidden">
          <button
            type="button"
            onClick={onClose}
            className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white ${clubHubButtonFocusClass}`}
            style={{ backgroundColor: MAROON }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
