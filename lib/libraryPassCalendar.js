/** LCPS 2025-26 A/B calendar — remaining June 2026 school days only. */
export const JUNE_2026_AB_SCHEDULE = {
  "2026-06-03": "A",
  "2026-06-04": "B",
  "2026-06-05": "A",
  "2026-06-08": "B",
  "2026-06-09": "A",
  "2026-06-10": "B",
  "2026-06-11": "A",
  "2026-06-12": "B",
};

export const LIBRARY_PASS_FIRST_YMD = "2026-06-03";
export const LIBRARY_PASS_LAST_YMD = "2026-06-12";

export function getScheduledDayType(ymd) {
  return JUNE_2026_AB_SCHEDULE[ymd] ?? null;
}

export function isLibraryPassDay(ymd) {
  return ymd in JUNE_2026_AB_SCHEDULE;
}
