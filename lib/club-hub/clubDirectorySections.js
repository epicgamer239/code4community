import {
  clubNameToSlug,
  getClubBySlug,
  listAllDirectoryClubs,
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

/**
 * Admin-assigned meeting day per club slug (Firestore `clubHubMeetingDays`).
 * "both" = Gold and Maroon. Clubs without an override use the lists above.
 *
 * @typedef {"gold" | "maroon" | "both" | "general"} ClubMeetingDay
 */

/** @type {ClubMeetingDay[]} */
export const CLUB_MEETING_DAY_VALUES = ["gold", "maroon", "both", "general"];

/** @param {unknown} value @returns {ClubMeetingDay | null} */
export function normalizeClubMeetingDay(value) {
  return CLUB_MEETING_DAY_VALUES.includes(/** @type {ClubMeetingDay} */ (value))
    ? /** @type {ClubMeetingDay} */ (value)
    : null;
}

/** @type {Record<string, ClubMeetingDay>} */
let meetingDayOverrides = {};

/** @param {Record<string, unknown> | null | undefined} overridesBySlug */
export function setMeetingDayOverrides(overridesBySlug) {
  /** @type {Record<string, ClubMeetingDay>} */
  const next = {};
  for (const [slug, value] of Object.entries(overridesBySlug || {})) {
    const day = normalizeClubMeetingDay(value);
    if (slug && day) next[slug] = day;
  }
  meetingDayOverrides = next;
}

/** @returns {Record<string, ClubMeetingDay>} */
export function getMeetingDayOverrides() {
  return meetingDayOverrides;
}

/**
 * Open (non–board-only) fair rows decide the club's join/meeting day.
 * Board-only-only rows (Key Club Gold, Interact Maroon, …) keep the club General for
 * regular members; board eligibility is handled separately in meetingDayBoardAccess.
 *
 * @param {string} slug
 * @returns {ClubMeetingDay}
 */
export function getDefaultMeetingDayForSlug(slug) {
  const gold = slugHasOpenFairListing(GOLD_DIRECTORY_ENTRIES, slug);
  const maroon = slugHasOpenFairListing(MAROON_DIRECTORY_ENTRIES, slug);
  if (gold && maroon) return "both";
  if (gold) return "gold";
  if (maroon) return "maroon";
  return "general";
}

/** @param {string} slug @returns {ClubMeetingDay} */
export function getEffectiveMeetingDayForSlug(slug) {
  return meetingDayOverrides[slug] || getDefaultMeetingDayForSlug(slug);
}

/** @param {ClubMeetingDay} meetingDay @param {"gold" | "maroon"} day */
function meetingDayIncludes(meetingDay, day) {
  return meetingDay === "both" || meetingDay === day;
}

/**
 * Drop a student's Gold or Maroon pick when that club no longer meets that day.
 *
 * @param {{ goldClubSlug?: string, maroonClubSlug?: string }} choices
 * @param {string} slug
 * @param {ClubMeetingDay} meetingDay
 */
export function meetingChoicesAfterClubDayChange(choices, slug, meetingDay) {
  const clubSlug = slug?.trim() || "";
  const previousGold = choices.goldClubSlug || "";
  const previousMaroon = choices.maroonClubSlug || "";
  const goldClubSlug =
    clubSlug && previousGold === clubSlug && !meetingDayIncludes(meetingDay, "gold")
      ? ""
      : previousGold;
  const maroonClubSlug =
    clubSlug && previousMaroon === clubSlug && !meetingDayIncludes(meetingDay, "maroon")
      ? ""
      : previousMaroon;
  return {
    goldClubSlug,
    maroonClubSlug,
    changed: goldClubSlug !== previousGold || maroonClubSlug !== previousMaroon,
  };
}

/**
 * Directory rows for one day after admin overrides. An overridden club keeps its
 * default rows for that day (labels / board-only), or gets a plain row if it had none.
 *
 * @param {DirectoryEntry[]} defaults
 * @param {"gold" | "maroon"} day
 * @returns {DirectoryEntry[]}
 */
function effectiveEntriesForDay(defaults, day) {
  const out = defaults.filter((e) => !meetingDayOverrides[e.slug]);
  for (const [slug, meetingDay] of Object.entries(meetingDayOverrides)) {
    if (!meetingDayIncludes(meetingDay, day)) continue;
    const rows = defaults.filter((e) => e.slug === slug);
    out.push(...(rows.length ? rows : [{ slug }]));
  }
  return out;
}

/** Gold fair / meeting-day rows including admin overrides. */
export function getGoldDirectoryEntries() {
  return effectiveEntriesForDay(GOLD_DIRECTORY_ENTRIES, "gold");
}

/** Maroon fair / meeting-day rows including admin overrides. */
export function getMaroonDirectoryEntries() {
  return effectiveEntriesForDay(MAROON_DIRECTORY_ENTRIES, "maroon");
}

/** @param {string | undefined} labelSuffix */
function isBoardOnlyFairSuffix(labelSuffix) {
  return typeof labelSuffix === "string" && /\(Board only\)/i.test(labelSuffix);
}

/** @param {DirectoryEntry[]} entries @param {string} slug */
function slugHasOpenFairListing(entries, slug) {
  return entries.some((e) => e.slug === slug && !isBoardOnlyFairSuffix(e.labelSuffix));
}

/**
 * Default slugs eligible for Gold / Maroon meeting-day picks (before admin overrides).
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
  const goldEntries = getGoldDirectoryEntries();
  const maroonEntries = getMaroonDirectoryEntries();
  const gold = resolveEntries(goldEntries, "gold");
  const maroon = resolveEntries(maroonEntries, "maroon");

  /** @type {DirectoryClubLink[]} */
  const general = [];
  for (const club of listAllDirectoryClubs()) {
    const slug = clubNameToSlug(club.name);
    if (slugHasOpenFairListing(goldEntries, slug) || slugHasOpenFairListing(maroonEntries, slug)) {
      continue;
    }
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

/**
 * True when the club has any Gold fair/seminar presence (open or board-only),
 * or an admin override that includes Gold.
 * @param {string} slug
 */
export function isGoldDayClubSlug(slug) {
  if (meetingDayIncludes(getEffectiveMeetingDayForSlug(slug), "gold")) return true;
  return getGoldDirectoryEntries().some((e) => e.slug === slug);
}

/**
 * True when the club has any Maroon fair/seminar presence (open or board-only),
 * or an admin override that includes Maroon.
 * @param {string} slug
 */
export function isMaroonDayClubSlug(slug) {
  if (meetingDayIncludes(getEffectiveMeetingDayForSlug(slug), "maroon")) return true;
  return getMaroonDirectoryEntries().some((e) => e.slug === slug);
}
