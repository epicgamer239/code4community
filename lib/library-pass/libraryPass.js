/** Library Pass — 8 blocks; A day = 1–4, B day = 5–8. */

import {
  getScheduledDayType,
  isLibraryPassDay,
  LIBRARY_PASS_FIRST_YMD,
  LIBRARY_PASS_LAST_YMD,
} from "@/lib/library-pass/calendar";

export { isLibraryPassDay, LIBRARY_PASS_FIRST_YMD, LIBRARY_PASS_LAST_YMD };

export const LIBRARY_PASS_SETTINGS_ID = "config";

export const LIBRARY_PASS_BLOCKS = [
  { id: 1, label: "Block 1", dayType: "A" },
  { id: 2, label: "Block 2", dayType: "A" },
  { id: 3, label: "Block 3", dayType: "A" },
  { id: 4, label: "Block 4", dayType: "A" },
  { id: 5, label: "Block 5", dayType: "B" },
  { id: 6, label: "Block 6", dayType: "B" },
  { id: 7, label: "Block 7", dayType: "B" },
  { id: 8, label: "Block 8", dayType: "B" },
];

export const DEFAULT_BLOCK_CAPACITIES = Object.fromEntries(
  LIBRARY_PASS_BLOCKS.map((b) => [String(b.id), 15]),
);

export function toYmd(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseYmd(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDisplayDate(ymd) {
  const d = parseYmd(ymd);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** A, B, or null when not a scheduled LCPS school day. Admin override wins. */
export function resolveDayType(date = new Date(), settings) {
  const override = settings?.dayTypeOverride;
  if (override === "A" || override === "B") return override;
  return getScheduledDayType(toYmd(date));
}

export function blocksForDayType(dayType) {
  if (!dayType) return [];
  return LIBRARY_PASS_BLOCKS.filter((b) => b.dayType === dayType);
}

export function getBlockMeta(blockId) {
  return LIBRARY_PASS_BLOCKS.find((b) => b.id === blockId) || null;
}

/**
 * Study hall blocks a student may use for Library Pass (1–8).
 * Empty / missing = unrestricted (legacy).
 * @param {unknown} value
 * @returns {number[]}
 */
export function normalizeStudyHallBlocks(value) {
  const allowed = new Set(LIBRARY_PASS_BLOCKS.map((b) => b.id));
  const list = Array.isArray(value) ? value : [];
  const next = [];
  for (const item of list) {
    const id = Number(item);
    if (!allowed.has(id) || next.includes(id)) continue;
    next.push(id);
  }
  return next.sort((a, b) => a - b);
}

/**
 * @param {{ studyHallBlocks?: unknown } | null | undefined} userData
 * @param {number|string} blockId
 */
export function studentCanUseLibraryBlock(userData, blockId) {
  const allowed = normalizeStudyHallBlocks(userData?.studyHallBlocks);
  if (allowed.length === 0) return true;
  return allowed.includes(Number(blockId));
}

/** @param {number[]} blocks */
export function studyHallBlocksLabel(blocks) {
  const normalized = normalizeStudyHallBlocks(blocks);
  if (normalized.length === 0) return "Not set (any block)";
  return normalized.map((id) => `Block ${id}`).join(" · ");
}

/** One active pass per student per day (doc id is date + uid). */
export function passDocId(date, studentId) {
  return `${date}_${studentId}`;
}

export function normalizeSettings(raw) {
  const capacities = { ...DEFAULT_BLOCK_CAPACITIES };
  if (raw?.blockCapacities && typeof raw.blockCapacities === "object") {
    for (const block of LIBRARY_PASS_BLOCKS) {
      const key = String(block.id);
      const val = raw.blockCapacities[key];
      if (typeof val === "number" && val >= 0 && val <= 500) {
        capacities[key] = Math.floor(val);
      }
    }
  }
  return {
    passesEnabled: raw?.passesEnabled !== false,
    blockCapacities: capacities,
    dayTypeOverride:
      raw?.dayTypeOverride === "A" || raw?.dayTypeOverride === "B"
        ? raw.dayTypeOverride
        : null,
  };
}

export function countActivePassesForBlock(passes, blockId) {
  return passes.filter(
    (p) => p.status === "active" && Number(p.blockId) === Number(blockId),
  ).length;
}

export function capacityForBlock(settings, blockId) {
  return settings?.blockCapacities?.[String(blockId)] ?? 15;
}
