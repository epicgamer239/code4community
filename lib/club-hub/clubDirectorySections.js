import {
  BROAD_RUN_CLUBS,
  clubNameToSlug,
  getClubBySlug,
} from "@/lib/club-hub/broadRunClubDirectory";

/**
 * School fair / directory listings. Same slug may appear twice with different labels
 * (e.g. BSU all members on Gold vs exec board on Maroon).
 *
 * @typedef {{ slug: string, labelSuffix?: string, key?: string }} DirectoryEntry
 */

/** @type {DirectoryEntry[]} */
export const GOLD_DIRECTORY_ENTRIES = [
  { slug: "ai" },
  { slug: "american-cancer-society" },
  { slug: "asian-student-association-asa" },
  { slug: "black-student-union-bsu" },
  { slug: "code4community", labelSuffix: "(B days only)" },
  { slug: "deca", labelSuffix: "(10/14 only)" },
  { slug: "educators-rising" },
  { slug: "future-business-leaders-of-america-fbla", labelSuffix: "(A days only)" },
  { slug: "german-club" },
  { slug: "girls-who-code" },
  {
    slug: "hispanic-student-union",
    key: "hsu-gold-board",
    labelSuffix: "(Board only)",
  },
  { slug: "jewish-student-union-jsu" },
  {
    slug: "key-club",
    key: "key-club-gold-board",
    labelSuffix: "(Board only)",
  },
  { slug: "mock-trial" },
  { slug: "national-english-honor-society-psi-epsilon-nu-pen" },
  { slug: "national-art-honor-society-nahs", labelSuffix: "(Board only)" },
  { slug: "science-olympiad" },
  { slug: "show-choir-spartan-songbirds" },
  { slug: "sports-talk" },
  { slug: "thrift-club" },
  { slug: "top-gear-spartans" },
  { slug: "spartans-ink-literary-magazine-unbound-creative-writing" },
  { slug: "we-re-all-human" },
];

/** @type {DirectoryEntry[]} */
export const MAROON_DIRECTORY_ENTRIES = [
  { slug: "all-real-music" },
  { slug: "asian-student-association-asa" },
  { slug: "baking-club" },
  { slug: "best-buddies" },
  {
    slug: "black-student-union-bsu",
    key: "bsu-maroon-exec",
    labelSuffix: "(Board only)",
  },
  { slug: "code4community", labelSuffix: "(B days only)" },
  { slug: "computer-science-honor-society" },
  { slug: "family-career-and-community-leaders-of-america-fccla" },
  { slug: "deca" },
  { slug: "fishing-club" },
  { slug: "gender-sexuality-alliance" },
  { slug: "hiking-club" },
  { slug: "hispanic-student-union" },
  { slug: "medlife" },
  { slug: "philippine-united-student-union-puso" },
  { slug: "show-choir-spartan-songbirds" },
  { slug: "sports-talk" },
  { slug: "stock-market-club" },
  { slug: "technology-student-association-tsa" },
  { slug: "top-gear-spartans" },
  { slug: "spartans-ink-literary-magazine-unbound-creative-writing" },
  { slug: "unicef" },
  { slug: "yarn-arts-club" },
  {
    slug: "interact",
    key: "interact-maroon-board",
    labelSuffix: "(Board only)",
  },
];

/** @param {string | undefined} labelSuffix */
function isBoardOnlyFairSuffix(labelSuffix) {
  return typeof labelSuffix === "string" && /\(Board only\)/i.test(labelSuffix);
}

/** Fair row counts toward that day section (not General-only). */
function slugHasOpenGoldFairListing(slug) {
  return GOLD_DIRECTORY_ENTRIES.some(
    (e) => e.slug === slug && !isBoardOnlyFairSuffix(e.labelSuffix),
  );
}

function slugHasOpenMaroonFairListing(slug) {
  return MAROON_DIRECTORY_ENTRIES.some(
    (e) => e.slug === slug && !isBoardOnlyFairSuffix(e.labelSuffix),
  );
}

/**
 * Slugs eligible for Gold / Maroon meeting-day picks (joined clubs only).
 */
export const GOLD_DAY_CLUB_SLUGS = new Set(GOLD_DIRECTORY_ENTRIES.map((e) => e.slug));

export const MAROON_DAY_CLUB_SLUGS = new Set(MAROON_DIRECTORY_ENTRIES.map((e) => e.slug));

/**
 * @typedef {{ slug: string, name: string, key: string }} DirectoryClubLink
 */

/** @param {DirectoryEntry} entry @param {string} section */
function resolveDirectoryEntry(entry, section) {
  const club = getClubBySlug(entry.slug);
  if (!club) return null;
  const suffix = entry.labelSuffix ? ` ${entry.labelSuffix}` : "";
  const key =
    entry.key ||
    `${section}-${entry.slug}${entry.labelSuffix ? `-${entry.labelSuffix.replace(/\W+/g, "-").toLowerCase()}` : ""}`;
  return {
    slug: entry.slug,
    name: `${club.name}${suffix}`,
    key,
  };
}

/** @param {DirectoryEntry[]} entries @param {string} section */
function resolveEntries(entries, section) {
  /** @type {DirectoryClubLink[]} */
  const out = [];
  for (const entry of entries) {
    const row = resolveDirectoryEntry(entry, section);
    if (row) out.push(row);
  }
  return out;
}

const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

/** @returns {{ gold: DirectoryClubLink[], maroon: DirectoryClubLink[], general: DirectoryClubLink[] }} */
export function getClubsGroupedByMeetingDay() {
  const gold = resolveEntries(GOLD_DIRECTORY_ENTRIES, "gold");
  const maroon = resolveEntries(MAROON_DIRECTORY_ENTRIES, "maroon");

  /** @type {DirectoryClubLink[]} */
  const general = [];
  for (const club of BROAD_RUN_CLUBS) {
    const slug = clubNameToSlug(club.name);
    if (slugHasOpenGoldFairListing(slug) || slugHasOpenMaroonFairListing(slug)) continue;
    general.push({
      slug,
      name: club.name,
      key: slug,
    });
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
