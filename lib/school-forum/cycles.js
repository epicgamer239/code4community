import {
  CONCERN_STATES,
  DEFAULT_CYCLE_DAYS,
  PUBLIC_STATUSES,
  RESULTS_TOP_COUNT,
} from "@/lib/school-forum/constants";
import { toMillis } from "@/lib/school-forum/dates";
import { ForumError } from "@/lib/school-forum/errors";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_CYCLE_DAYS = 60;

export const CYCLE_PHASES = {
  SCHEDULED: "scheduled",
  OPEN: "open",
  /** Past its end date but not closed yet; closed on the next request. */
  ENDED: "ended",
  CLOSED: "closed",
};

/** @param {number} startMs */
export function defaultCycleEnd(startMs) {
  return startMs + DEFAULT_CYCLE_DAYS * DAY_MS;
}

/**
 * @param {{ startsAt?: unknown, endsAt?: unknown, closedAt?: unknown }} cycle
 * @param {number} now
 */
export function cyclePhase(cycle, now) {
  if (toMillis(cycle?.closedAt) != null) return CYCLE_PHASES.CLOSED;
  const start = toMillis(cycle?.startsAt);
  const end = toMillis(cycle?.endsAt);
  if (start == null || end == null) return CYCLE_PHASES.CLOSED;
  if (now < start) return CYCLE_PHASES.SCHEDULED;
  if (now < end) return CYCLE_PHASES.OPEN;
  return CYCLE_PHASES.ENDED;
}

export function isVotingOpen(cycle, now) {
  return Boolean(cycle) && cyclePhase(cycle, now) === CYCLE_PHASES.OPEN;
}

/** The cycle students vote in right now, if any. */
export function findOpenCycle(cycles, now) {
  return cycles.find((c) => cyclePhase(c, now) === CYCLE_PHASES.OPEN) ?? null;
}

/** Cycles whose end date passed without being closed. */
export function cyclesNeedingClose(cycles, now) {
  return cycles.filter((c) => cyclePhase(c, now) === CYCLE_PHASES.ENDED);
}

/** End of the time a cycle actually covered (early close counts). */
function effectiveEnd(cycle) {
  const closed = toMillis(cycle.closedAt);
  const end = toMillis(cycle.endsAt);
  if (closed != null && end != null) return Math.min(closed, end);
  return closed ?? end;
}

/**
 * Validate a new cycle's dates against existing ones. Returns { startMs, endMs }.
 * @param {{ startsAt?: unknown, endsAt?: unknown }} input endsAt may be omitted (default length)
 * @param {object[]} existingCycles
 * @param {number} now
 */
export function validateNewCycle(input, existingCycles, now) {
  const startMs = toMillis(input?.startsAt);
  if (startMs == null) throw new ForumError("Enter a valid start date.");
  const endMs = input?.endsAt == null || input.endsAt === "" ? defaultCycleEnd(startMs) : toMillis(input.endsAt);
  if (endMs == null) throw new ForumError("Enter a valid end date.");
  if (endMs <= startMs) throw new ForumError("The end date must be after the start date.");
  if (endMs - startMs > MAX_CYCLE_DAYS * DAY_MS) {
    throw new ForumError(`A cycle can be at most ${MAX_CYCLE_DAYS} days long.`);
  }
  if (endMs <= now) throw new ForumError("The end date must be in the future.");

  for (const cycle of existingCycles) {
    const s = toMillis(cycle.startsAt);
    const e = effectiveEnd(cycle);
    if (s == null || e == null) continue;
    if (startMs < e && s < endMs) {
      throw new ForumError("These dates overlap another cycle. Cycles can't overlap.", 409);
    }
  }
  return { startMs, endMs };
}

/** Approved concerns still marked Open carry over and can be voted on in any cycle. */
export function isVoteEligibleConcern(concern) {
  return (
    concern?.state === CONCERN_STATES.APPROVED &&
    (concern.publicStatus ?? PUBLIC_STATUSES.OPEN) === PUBLIC_STATUSES.OPEN
  );
}

/**
 * Rank the concerns that were open for voting when a cycle closed.
 * Ties: earlier-posted first, then id, so the order is stable.
 * @param {{ id: string, title: string, category: string, createdAt?: unknown }[]} eligibleConcerns
 * @param {Record<string, number>} counts
 * @returns {{ concernId: string, title: string, category: string, votes: number, rank: number }[]}
 */
export function rankConcerns(eligibleConcerns, counts) {
  const sorted = [...eligibleConcerns].sort((a, b) => {
    const dv = (counts[b.id] || 0) - (counts[a.id] || 0);
    if (dv) return dv;
    const da = (toMillis(a.createdAt) ?? 0) - (toMillis(b.createdAt) ?? 0);
    if (da) return da;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  let rank = 0;
  let prevVotes = null;
  return sorted.map((c, i) => {
    const votes = counts[c.id] || 0;
    if (votes !== prevVotes) {
      rank = i + 1;
      prevVotes = votes;
    }
    return { concernId: c.id, title: c.title, category: c.category, votes, rank };
  });
}

/**
 * The presentation list SCA takes to administrators: the top voted concerns (with at least one vote),
 * plus any lower-ranked concerns staff flagged as important.
 * @param {{ concernId: string, votes: number }[]} ranked
 * @param {string[]} flaggedIds
 */
export function summarizeResults(ranked, flaggedIds = [], topCount = RESULTS_TOP_COUNT) {
  const flagged = new Set(flaggedIds);
  const top = ranked.filter((r) => r.votes > 0).slice(0, topCount);
  const topIds = new Set(top.map((r) => r.concernId));
  const extra = ranked.filter((r) => flagged.has(r.concernId) && !topIds.has(r.concernId));
  return [
    ...top.map((r) => ({ ...r, flagged: flagged.has(r.concernId), addedByFlag: false })),
    ...extra.map((r) => ({ ...r, flagged: true, addedByFlag: true })),
  ];
}
