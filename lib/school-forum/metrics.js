import { countUniqueVoters } from "@/lib/school-forum/ballots";
import { toIso, toMillis } from "@/lib/school-forum/dates";

/**
 * Per-cycle pilot metrics. A cycle's window runs from its start until the next cycle starts
 * (start inclusive, end exclusive), so presenting and resolving concerns after voting closes
 * still counts toward the cycle they came from.
 * @param {{ id: string, label?: string, startsAt: unknown, endsAt: unknown, closedAt?: unknown }} cycle
 * @param {Record<string, unknown>[]} concerns all concerns at the school
 * @param {{ concernIds?: unknown }[]} ballots this cycle's ballots
 * @param {{ windowEnd?: unknown }} [options] next cycle's start; omit for the latest cycle
 */
export function computeCycleMetrics(cycle, concerns, ballots, { windowEnd } = {}) {
  const start = toMillis(cycle.startsAt) ?? 0;
  const end = toMillis(windowEnd) ?? Infinity;
  const inWindow = (value) => {
    const ms = toMillis(value);
    return ms != null && ms >= start && ms < end;
  };
  const count = (field) => concerns.filter((c) => inWindow(c[field])).length;

  return {
    cycleId: cycle.id,
    label: String(cycle.label ?? ""),
    startsAt: toIso(cycle.startsAt),
    endsAt: toIso(cycle.closedAt ?? cycle.endsAt),
    postsSubmitted: count("createdAt"),
    approved: count("approvedAt"),
    rejected: count("rejectedAt"),
    safetyFlagged: count("safetyFlaggedAt"),
    uniqueVoters: countUniqueVoters(ballots),
    concernsPresented: count("presentedAt"),
    concernsResolved: count("resolvedAt"),
  };
}

export const METRICS_COLUMNS = [
  ["label", "Cycle"],
  ["startsAt", "Start"],
  ["endsAt", "End"],
  ["postsSubmitted", "Posts submitted"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
  ["safetyFlagged", "Safety-flagged"],
  ["uniqueVoters", "Unique voters"],
  ["concernsPresented", "Concerns presented"],
  ["concernsResolved", "Concerns resolved"],
];

function csvCell(value) {
  let text = value == null ? "" : String(value);
  // Keep spreadsheet apps from treating a cell as a formula.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** @param {Record<string, unknown>[]} rows */
export function metricsToCsv(rows) {
  const header = METRICS_COLUMNS.map(([, label]) => csvCell(label)).join(",");
  const lines = rows.map((row) => METRICS_COLUMNS.map(([key]) => csvCell(row[key])).join(","));
  return [header, ...lines].join("\r\n") + "\r\n";
}
