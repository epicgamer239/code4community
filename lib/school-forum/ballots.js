import { MAX_VOTES_PER_CYCLE } from "@/lib/school-forum/constants";
import { ForumError } from "@/lib/school-forum/errors";

/**
 * Clean a stored ballot: unique string ids, at most MAX_VOTES_PER_CYCLE.
 * @param {unknown} ids
 * @returns {string[]}
 */
export function normalizeBallotIds(ids) {
  if (!Array.isArray(ids)) return [];
  const out = [];
  for (const id of ids) {
    if (typeof id === "string" && id && !out.includes(id)) out.push(id);
  }
  return out.slice(0, MAX_VOTES_PER_CYCLE);
}

/**
 * Add or remove one vote. Throws ForumError when the change isn't allowed.
 * @param {string[]} currentIds
 * @param {{ concernId: string, action: "add" | "remove" }} change
 * @param {{ cycleOpen: boolean, isEligible: (concernId: string) => boolean }} options
 * @returns {string[]}
 */
export function applyBallotChange(currentIds, { concernId, action }, { cycleOpen, isEligible }) {
  if (!cycleOpen) {
    throw new ForumError("Voting is closed. Votes can't be changed after a cycle ends.", 409);
  }
  if (typeof concernId !== "string" || !concernId) {
    throw new ForumError("Choose a concern to vote for.");
  }

  const ids = normalizeBallotIds(currentIds);

  if (action === "remove") {
    if (!ids.includes(concernId)) {
      throw new ForumError("You haven't voted for this concern.", 409);
    }
    return ids.filter((id) => id !== concernId);
  }

  if (action !== "add") {
    throw new ForumError("Unknown vote action.");
  }
  if (ids.includes(concernId)) {
    throw new ForumError("You already voted for this concern. Each concern can get one of your votes.", 409);
  }
  if (!isEligible(concernId)) {
    throw new ForumError("This concern isn't open for voting.", 409);
  }
  if (ids.length >= MAX_VOTES_PER_CYCLE) {
    throw new ForumError(
      `You've used all ${MAX_VOTES_PER_CYCLE} votes. Remove one to vote for a different concern.`,
      409,
    );
  }
  return [...ids, concernId];
}

/**
 * @param {{ concernIds?: unknown }[]} ballots
 * @returns {Record<string, number>}
 */
export function tallyBallots(ballots) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const ballot of ballots) {
    for (const id of normalizeBallotIds(ballot?.concernIds)) {
      counts[id] = (counts[id] || 0) + 1;
    }
  }
  return counts;
}

/** @param {{ concernIds?: unknown }[]} ballots */
export function countUniqueVoters(ballots) {
  return ballots.filter((b) => normalizeBallotIds(b?.concernIds).length > 0).length;
}

/**
 * Move a vote from a merged duplicate to the concern it was merged into.
 * A voter who had voted for both keeps one vote on the target and gets the other back.
 * @param {string[]} ids
 * @param {string} fromId
 * @param {string} toId
 * @returns {{ ids: string[], changed: boolean }}
 */
export function remapBallotForMerge(ids, fromId, toId) {
  const clean = normalizeBallotIds(ids);
  if (!clean.includes(fromId)) return { ids: clean, changed: false };
  if (clean.includes(toId)) {
    return { ids: clean.filter((id) => id !== fromId), changed: true };
  }
  return { ids: clean.map((id) => (id === fromId ? toId : id)), changed: true };
}
