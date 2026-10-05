import { BROAD_RUN_CLUBS, clubNameToSlug } from "@/lib/club-hub/broadRunClubDirectory";

/** Clubs that meet on Gold (A) days — school club fair list. */
export const GOLD_DAY_CLUB_SLUGS = new Set([
  "ai",
  "american-cancer-society",
  "asian-student-association-asa",
  "black-student-union-bsu",
  "code4community",
  "deca",
  "educators-rising",
  "future-business-leaders-of-america-fbla",
  "german-club",
  "girls-who-code",
  "hispanic-student-union",
  "jewish-student-union-jsu",
  "key-club",
  "mock-trial",
  "national-english-honor-society-psi-epsilon-nu-pen",
  "national-art-honor-society-nahs",
  "science-olympiad",
  "show-choir-spartan-songbirds",
  "sports-talk",
  "thrift-club",
  "top-gear-spartans",
  "spartans-ink-literary-magazine-unbound-creative-writing",
  "we-re-all-human",
]);

/** Clubs that meet on Maroon (B) days — school club fair list. */
export const MAROON_DAY_CLUB_SLUGS = new Set([
  "all-real-music",
  "asian-student-association-asa",
  "baking-club",
  "best-buddies",
  "black-student-union-bsu",
  "code4community",
  "computer-science-honor-society",
  "family-career-and-community-leaders-of-america-fccla",
  "deca",
  "fishing-club",
  "gender-sexuality-alliance",
  "hiking-club",
  "hispanic-student-union",
  "interact",
  "medlife",
  "philippine-united-student-union-puso",
  "show-choir-spartan-songbirds",
  "sports-talk",
  "stock-market-club",
  "technology-student-association-tsa",
  "top-gear-spartans",
  "spartans-ink-literary-magazine-unbound-creative-writing",
  "unicef",
  "yarn-arts-club",
]);

const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

/** @returns {{ gold: typeof BROAD_RUN_CLUBS, maroon: typeof BROAD_RUN_CLUBS, general: typeof BROAD_RUN_CLUBS }} */
export function getClubsGroupedByMeetingDay() {
  /** @type {typeof BROAD_RUN_CLUBS} */
  const gold = [];
  /** @type {typeof BROAD_RUN_CLUBS} */
  const maroon = [];
  /** @type {typeof BROAD_RUN_CLUBS} */
  const general = [];

  for (const club of BROAD_RUN_CLUBS) {
    const slug = clubNameToSlug(club.name);
    const inGold = GOLD_DAY_CLUB_SLUGS.has(slug);
    const inMaroon = MAROON_DAY_CLUB_SLUGS.has(slug);
    if (inGold) gold.push(club);
    if (inMaroon) maroon.push(club);
    if (!inGold && !inMaroon) general.push(club);
  }

  gold.sort(byName);
  maroon.sort(byName);
  general.sort(byName);
  return { gold, maroon, general };
}

/** @param {string} slug */
export function isGoldDayClubSlug(slug) {
  return GOLD_DAY_CLUB_SLUGS.has(slug);
}

/** @param {string} slug */
export function isMaroonDayClubSlug(slug) {
  return MAROON_DAY_CLUB_SLUGS.has(slug);
}
