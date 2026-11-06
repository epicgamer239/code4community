import { BRHS_CLUB_HUB_CONFIG } from "@/lib/club-hub/schoolConfig";

/** @deprecated Prefer school.brand.primary via useClubHubSchool(). */
export const CLUB_HUB_MAROON = BRHS_CLUB_HUB_CONFIG.brand.primary;
/** @deprecated Prefer school.brand.primaryDark via useClubHubSchool(). */
export const CLUB_HUB_MAROON_DARK = BRHS_CLUB_HUB_CONFIG.brand.primaryDark;
/** @deprecated Prefer school.brand.heading via useClubHubSchool(). */
export const CLUB_HUB_HEADING = BRHS_CLUB_HUB_CONFIG.brand.heading;
export const CLUB_HUB_PAGE_BG = "#f3f4f6";

export const CLUB_HUB_CARD =
  "rounded-[14px] bg-white p-5 sm:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_10px_28px_rgba(0,0,0,0.05)]";

/** Muted copy on white/light backgrounds (WCAG AA for text-sm and below). */
export const CLUB_HUB_MUTED_TEXT_CLASS = "text-neutral-700";

/**
 * @param {import("@/lib/club-hub/schoolConfig").ClubHubSchoolConfig | null | undefined} school
 */
export function clubHubBrand(school) {
  return school?.brand || BRHS_CLUB_HUB_CONFIG.brand;
}

/** @param {string} hex @param {number} alpha 0–1 */
export function hexToRgba(hex, alpha) {
  const raw = String(hex || "").replace("#", "");
  if (raw.length !== 6) return `rgba(0,0,0,${alpha})`;
  const n = Number.parseInt(raw, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
