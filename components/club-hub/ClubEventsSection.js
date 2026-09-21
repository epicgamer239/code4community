"use client";

import { CLUB_HUB_MAROON_DARK } from "@/lib/club-hub/theme";
import { formatEventDateLabel } from "@/lib/club-hub/clubEvents";

/**
 * @param {{
 *   loadingEvents: boolean,
 *   upcomingEvents: Array<{ id: string, title: string, date: string, time: string, location?: string, description?: string }>,
 *   canEdit: boolean,
 *   authLoading: boolean,
 *   accessLoading: boolean,
 *   onOpenEditor: () => void,
 * }} props
 */
export default function ClubEventsSection({
  loadingEvents,
  upcomingEvents,
  canEdit,
  authLoading,
  accessLoading,
  onOpenEditor,
}) {
  return (
    <section
      className="relative border-t border-black/10"
      style={{
        backgroundColor: CLUB_HUB_MAROON_DARK,
        backgroundImage:
          "linear-gradient(rgba(40,8,10,0.88), rgba(40,8,10,0.92)), url(/brand/brh.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="pointer-events-none absolute inset-0 backdrop-blur-[1px]" aria-hidden />
      <div className="relative z-10 w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white sm:text-xl">Meetings and activities:</h2>
          {!authLoading && !accessLoading && canEdit && (
            <button
              type="button"
              onClick={onOpenEditor}
              className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#5c1417] shadow-sm hover:bg-neutral-100 sm:px-3.5 sm:py-2 sm:text-sm"
            >
              Edit meetings &amp; activities
            </button>
          )}
        </div>
        <div className="mt-3 rounded-[14px] border border-white/15 bg-white/95 p-4 text-[15px] leading-relaxed text-neutral-800 shadow-sm sm:p-5">
          {loadingEvents ? (
            <p className="text-neutral-500">Loading…</p>
          ) : upcomingEvents.length === 0 ? (
            <p className="text-neutral-500">
              No upcoming meetings posted yet.
              {canEdit ? " Use Edit meetings & activities to add events." : ""}
            </p>
          ) : (
            <ul className="space-y-4">
              {upcomingEvents.map((ev) => (
                <li key={ev.id} className="border-b border-neutral-200 pb-4 last:border-0 last:pb-0">
                  <p className="font-bold text-[#111827]">{ev.title}</p>
                  <p className="mt-0.5 text-sm text-neutral-600">
                    {formatEventDateLabel(ev.date)} · {ev.time}
                    {ev.location ? ` · ${ev.location}` : ""}
                  </p>
                  {ev.description ? (
                    <p className="mt-2 whitespace-pre-wrap text-[15px] text-neutral-800">
                      {ev.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
