"use client";

import Link from "next/link";
import { getClubsGroupedByMeetingDay } from "@/lib/club-hub/clubDirectorySections";
/**
 * @param {{ clubs: { name: string, slug: string, key: string }[], buttonClassName: string }} props
 */
function ClubLinkGrid({ clubs, buttonClassName }) {
  if (!clubs.length) return null;
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-4">
      {clubs.map((club) => (
        <Link
          key={club.key}
          href={`/club-hub/directory/${club.slug}`}
          className={`flex min-h-[3.5rem] items-center justify-center rounded-[10px] px-2 py-3 text-center text-[11px] font-semibold leading-snug text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c1417] focus-visible:ring-offset-2 sm:min-h-[3.75rem] sm:text-xs md:text-sm ${buttonClassName}`}
        >
          <span className="line-clamp-4">{club.name}</span>
        </Link>
      ))}
    </div>
  );
}

/**
 * @param {{ id: string, title: string, subtitle?: string, children: React.ReactNode }} props
 */
function DirectorySection({ id, title, subtitle, children }) {
  return (
    <section className="mt-10 first:mt-6" aria-labelledby={id}>
      <div className="border-y border-neutral-900 py-4 sm:py-5">
        <h2
          id={id}
          className="text-center text-base font-bold uppercase tracking-[0.06em] text-[#5c1417] sm:text-lg"
        >
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-2 text-center text-sm text-neutral-700">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function BroadRunClubDirectory() {
  const { gold, maroon, general } = getClubsGroupedByMeetingDay();

  return (
    <>
      <div className="border-y border-neutral-900 py-4 sm:py-5">
        <h2 className="text-center text-base font-bold uppercase tracking-[0.06em] text-[#5c1417] sm:text-lg">
          Broad Run Club List
        </h2>
      </div>

      <p className="sr-only">
        Clubs grouped by Gold day, Maroon day, and general meetings. Open a club page for details
        and sponsors.
      </p>

      <DirectorySection id="club-directory-gold" title="Gold Clubs">
        <ClubLinkGrid
          clubs={gold}
          buttonClassName="bg-[#9a7b2f] hover:bg-[#7d6325]"
        />
      </DirectorySection>

      <DirectorySection id="club-directory-maroon" title="Maroon Clubs">
        <ClubLinkGrid
          clubs={maroon}
          buttonClassName="bg-[#5c1417] hover:bg-[#731a1f]"
        />
      </DirectorySection>

      <DirectorySection id="club-directory-general" title="General clubs">
        <ClubLinkGrid
          clubs={general}
          buttonClassName="bg-neutral-700 hover:bg-neutral-800"
        />
      </DirectorySection>
    </>
  );
}
