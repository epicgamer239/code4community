"use client";

import { useLayoutEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import LaurelRankSeal from "@/components/club-hub/LaurelRankSeal";
import ClubHubWeekCalendar from "@/components/club-hub/ClubHubWeekCalendar";
import ClubHubNav from "@/components/club-hub/ClubHubNav";
import { CLUB_ENGAGEMENT_RANKINGS } from "@/lib/club-hub/clubHubEngagementRankings";

const MAROON = "#5c1417";
const MAROON_DARK = "#3f0e10";

function rankNameClass(rank) {
  if (rank === 1) return "text-[#b45309]";
  if (rank === 2) return "text-slate-500";
  return "text-[#9a3412]";
}

export default function ClubHubPage() {
  useLayoutEffect(() => {
    document.title = "Broad Run Club Hub";
  }, []);

  return (
    <div id="top" className="min-h-screen bg-neutral-100 text-neutral-900">
      <section className="relative min-h-[246px] sm:min-h-[299px]">
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

      <main id="club-directory" className="mx-auto w-full max-w-7xl px-3 pb-0 pt-6 sm:px-5 sm:pt-8 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3 md:gap-5">
          {CLUB_ENGAGEMENT_RANKINGS.map((col) => (
            <div
              key={col.title}
              className="overflow-hidden rounded-xl border border-neutral-200/90 bg-white shadow-[0_6px_20px_rgba(0,0,0,0.06)]"
            >
              <div
                className="px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-white sm:text-xs"
                style={{ backgroundColor: MAROON }}
              >
                {col.title}
              </div>
              <ul className="space-y-1.5 bg-gradient-to-b from-neutral-50/90 to-white p-2 sm:p-2.5">
                {col.rows.map((row) => (
                  <li
                    key={`${col.title}-${row.name}`}
                    className="rounded-md bg-white px-1.5 py-1 shadow-[0_1px_4px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04] sm:px-2 sm:py-1.5"
                  >
                    <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                      <LaurelRankSeal rank={row.rank} size="sm" />
                      <span
                        className={`min-w-0 flex-1 px-0.5 text-center text-xs font-semibold leading-tight sm:text-sm ${rankNameClass(row.rank)}`}
                      >
                        {row.name}
                      </span>
                      <LaurelRankSeal rank={row.rank} size="sm" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>

      <div className="bg-white py-4 sm:py-5" aria-hidden />

      <section
        className="relative border-t border-black/10"
        style={{
          backgroundColor: MAROON_DARK,
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

      <footer className="border-t border-neutral-200 bg-white py-6 text-center text-xs text-neutral-500">
        <Link href="/" className="text-[#5c1417] hover:underline">
          ← Back to Code4Community
        </Link>
      </footer>
    </div>
  );
}
