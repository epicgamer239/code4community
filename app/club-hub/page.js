"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import LaurelRankSeal from "@/components/club-hub/LaurelRankSeal";
import ClubHubWeekCalendar from "@/components/club-hub/ClubHubWeekCalendar";
import ClubHubNav from "@/components/club-hub/ClubHubNav";
import ClubHubSkipLink from "@/components/club-hub/ClubHubSkipLink";
import { CLUB_HUB_MAIN_ID } from "@/lib/club-hub/a11y";
import { buildClubHubHomeRankings } from "@/lib/club-hub/clubHubEngagementRankings";
import { fetchClubSizeRankings } from "@/lib/club-hub/clubMembershipCounts";
import { logClientError } from "@/lib/auth/logClientError";
import {
  CLUB_HUB_MAROON,
  CLUB_HUB_MAROON_DARK,
  CLUB_HUB_MUTED_TEXT_CLASS,
} from "@/lib/club-hub/theme";
import { clubHubButtonFocusClass } from "@/lib/club-hub/a11y";

function rankNameClass(rank, placeholder) {
  if (placeholder) return "text-neutral-700 italic";
  if (rank === 1) return "text-[#92400e]";
  if (rank === 2) return "text-slate-600";
  return "text-[#9a3412]";
}

export default function ClubHubPage() {
  const [rankings, setRankings] = useState(() => buildClubHubHomeRankings([]));

  useLayoutEffect(() => {
    document.title = "Broad Run Club Hub";
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sizeRows = await fetchClubSizeRankings(3);
        if (!cancelled) setRankings(buildClubHubHomeRankings(sizeRows));
      } catch (err) {
        logClientError("ClubHubPage.rankings", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div id="top" className="min-h-screen bg-neutral-100 text-neutral-900">
      <ClubHubSkipLink />
      <section className="relative min-h-[246px] sm:min-h-[299px]" aria-label="Broad Run Club Hub banner">
        <Image
          src="/brand/brh.png"
          alt="Broad Run High School, Ashburn, Virginia"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, rgba(60,12,16,0.55) 0%, rgba(60,12,16,0.82) 100%)`,
          }}
        />
        <div className="relative z-10 flex min-h-[246px] flex-col items-center justify-center px-6 py-10 text-center sm:min-h-[299px] sm:py-12">
          <h1 className="max-w-4xl text-3xl font-bold tracking-tight text-white drop-shadow-md sm:text-4xl md:text-[2.75rem]">
            Broad Run Club Hub
          </h1>
        </div>
      </section>

      <ClubHubNav active="home" loginRedirect="/club-hub" />

      <main
        id={CLUB_HUB_MAIN_ID}
        className="mx-auto w-full max-w-7xl px-3 pb-0 pt-6 sm:px-5 sm:pt-8 lg:px-8"
        aria-labelledby="club-hub-rankings-heading"
      >
        <h2 id="club-hub-rankings-heading" className="sr-only">
          Club engagement rankings
        </h2>
        <div className="grid gap-4 md:grid-cols-3 md:gap-5">
          {rankings.map((col) => (
            <section
              key={col.title}
              aria-labelledby={`rank-col-${col.title.replace(/\s+/g, "-").toLowerCase()}`}
              className="overflow-hidden rounded-xl border border-neutral-200/90 bg-white shadow-[0_6px_20px_rgba(0,0,0,0.06)]"
            >
              <div
                id={`rank-col-${col.title.replace(/\s+/g, "-").toLowerCase()}`}
                className="px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-white sm:text-xs"
                style={{ backgroundColor: CLUB_HUB_MAROON }}
              >
                {col.title}
                {col.placeholder ? (
                  <span className="ml-1 font-normal normal-case text-rose-100">(preview)</span>
                ) : null}
              </div>
              <ul className="space-y-1.5 bg-gradient-to-b from-neutral-50/90 to-white p-2 sm:p-2.5">
                {col.rows.map((row) => (
                  <li
                    key={`${col.title}-${row.rank}`}
                    className="rounded-md bg-white px-1.5 py-1 shadow-[0_1px_4px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04] sm:px-2 sm:py-1.5"
                  >
                    <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                      <LaurelRankSeal rank={row.rank} size="sm" />
                      <span
                        className={`min-w-0 flex-1 px-0.5 text-center text-xs font-semibold leading-tight sm:text-sm ${rankNameClass(row.rank, row.placeholder)}`}
                      >
                        <span className="sr-only">{`Rank ${row.rank}: `}</span>
                        {row.name}
                      </span>
                      <LaurelRankSeal rank={row.rank} size="sm" />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>

      <div className="bg-white py-4 sm:py-5" aria-hidden />

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
        <div className="pointer-events-none absolute inset-0 backdrop-blur-[2px]" aria-hidden />
        <div className="relative z-10 w-full">
          <ClubHubWeekCalendar />
        </div>
      </section>

      <footer
        className={`border-t border-neutral-200 bg-white py-6 text-center text-xs ${CLUB_HUB_MUTED_TEXT_CLASS}`}
      >
        <Link
          href="/"
          className={`text-[#5c1417] hover:underline ${clubHubButtonFocusClass}`}
        >
          ← Back to Code4Community
        </Link>
      </footer>
    </div>
  );
}
