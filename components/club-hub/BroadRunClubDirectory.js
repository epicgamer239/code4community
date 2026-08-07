"use client";

import Link from "next/link";
import { BROAD_RUN_CLUBS, clubNameToSlug } from "@/lib/club-hub/broadRunClubDirectory";

const MAROON = "#5c1417";

export default function BroadRunClubDirectory() {
  return (
    <>
      <div className="border-y border-neutral-900 py-4 sm:py-5">
        <h2 className="text-center text-base font-bold uppercase tracking-[0.06em] text-[#5c1417] sm:text-lg">
          Broad Run Club List
        </h2>
      </div>

      <p className="sr-only">Club links below; open a club page for details and sponsor contacts.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-4">
        {BROAD_RUN_CLUBS.map((club) => (
          <Link
            key={club.name}
            href={`/club-hub/directory/${clubNameToSlug(club.name)}`}
            className="flex min-h-[3.5rem] items-center justify-center rounded-[10px] px-2 py-3 text-center text-[11px] font-semibold leading-snug text-white transition-colors hover:bg-[#731a1f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c1417] focus-visible:ring-offset-2 sm:min-h-[3.75rem] sm:text-xs md:text-sm"
            style={{ backgroundColor: MAROON }}
          >
            <span className="line-clamp-4">{club.name}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
