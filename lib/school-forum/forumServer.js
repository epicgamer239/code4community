/**
 * School Concerns Forum — server-side data access (Admin SDK). Every function takes the
 * resolved ForumContext, checks permission itself, and scopes reads/writes to ctx.schoolId.
 * Firestore rules deny all client access to forum collections, so this is the only way in.
 */
import {
  applyBallotChange,
  normalizeBallotIds,
  remapBallotForMerge,
  tallyBallots,
  countUniqueVoters,
} from "@/lib/school-forum/ballots";
import {
  CONCERN_STATES,
  FORUM_COLLECTIONS as C,
  FORUM_ROLES,
  LIMITS,
  MAX_VOTES_PER_CYCLE,
  PUBLIC_STATUSES,
} from "@/lib/school-forum/constants";
import {
  CYCLE_PHASES,
  cyclePhase,
  cyclesNeedingClose,
  findOpenCycle,
  isVoteEligibleConcern,
  rankConcerns,
  summarizeResults,
  validateNewCycle,
} from "@/lib/school-forum/cycles";
import { toMillis } from "@/lib/school-forum/dates";
import { ForumError, forbidden, notFound } from "@/lib/school-forum/errors";
import { computeCycleMetrics } from "@/lib/school-forum/metrics";
import { MODERATION_ACTIONS, assertCanModerate } from "@/lib/school-forum/moderation";
import {
  FORUM_ACTIONS,
  forumCan,
  forumCapabilities,
} from "@/lib/school-forum/permissions";
import { getForumSchool, listForumSchools } from "@/lib/school-forum/schools";
import {
  toAdminConcern,
  toIdentityReveal,
  toModeratorConcern,
  toOwnConcern,
  toPublicConcern,
  toPublicCycle,
  toStaffRow,
} from "@/lib/school-forum/serializers";
import { validateStatusChange } from "@/lib/school-forum/statusTransitions";
import {
  cleanText,
  isValidCategory,
  validateConcernInput,
  validateRejectionReason,
} from "@/lib/school-forum/validation";
import { isValidEmail, normalizeEmail } from "@/lib/email";

/** @typedef {import("@/lib/school-forum/permissions").ForumContext} ForumContext */
/** @typedef {import("firebase-admin/firestore").Firestore} Db */

const A = FORUM_ACTIONS;

function requireAction(ctx, action, message) {
  if (!forumCan(ctx, action)) throw forbidden(message);
}

const withId = (snap) => ({ id: snap.id, ...snap.data() });

async function loadSchoolDocs(db, collection, schoolId) {
  const snap = await db.collection(collection).where("schoolId", "==", schoolId).get();
  return snap.docs.map(withId);
}

async function loadConcern(db, ctx, concernId) {
  if (typeof concernId !== "string" || !concernId) throw notFound();
  const snap = await db.collection(C.CONCERNS).doc(concernId).get();
  if (!snap.exists) throw notFound();
  const concern = withId(snap);
  if (concern.schoolId !== ctx.schoolId) throw notFound();
  return concern;
}

async function loadPrivateMap(db, ids) {
  const entries = await Promise.all(
    ids.map(async (id) => {
      const snap = await db.collection(C.PRIVATE).doc(id).get();
      return [id, snap.exists ? snap.data() : null];
    }),
  );
  return Object.fromEntries(entries);
}

function groupResponses(responses) {
  /** @type {Record<string, object[]>} */
  const byConcern = {};
  for (const r of responses) {
    (byConcern[r.concernId] ||= []).push(r);
  }
  for (const list of Object.values(byConcern)) {
    list.sort((a, b) => (toMillis(a.createdAt) ?? 0) - (toMillis(b.createdAt) ?? 0));
  }
  return byConcern;
}

function logEntry(ctx, action, now) {
  return { action, byRole: ctx.role, byEmail: ctx.email, at: new Date(now) };
}

const ballotId = (cycleId, uid) => `${cycleId}__${uid}`;

// ---------------------------------------------------------------------------
// Cycles
// ---------------------------------------------------------------------------

/**
 * Close a cycle: lock voting and freeze the ranked results. Runs in a transaction that also
 * reads the cycle doc, so a vote racing the close is retried and then rejected.
 */
async function closeCycleTx(db, schoolId, cycleId, now) {
  const cycleRef = db.collection(C.CYCLES).doc(cycleId);
  const concernsQuery = db.collection(C.CONCERNS).where("schoolId", "==", schoolId);
  const ballotsQuery = db.collection(C.BALLOTS).where("cycleId", "==", cycleId);

  await db.runTransaction(async (tx) => {
    const cycleSnap = await tx.get(cycleRef);
    if (!cycleSnap.exists) throw notFound("That cycle could not be found.");
    const cycle = cycleSnap.data();
    if (cycle.schoolId !== schoolId) throw notFound("That cycle could not be found.");
    if (toMillis(cycle.closedAt) != null) return;

    const concerns = (await tx.get(concernsQuery)).docs.map(withId);
    const ballots = (await tx.get(ballotsQuery)).docs.map((d) => d.data());
    const counts = tallyBallots(ballots);
    const ranked = rankConcerns(concerns.filter(isVoteEligibleConcern), counts);

    tx.update(cycleRef, {
      closedAt: new Date(now),
      ranked,
      uniqueVoters: countUniqueVoters(ballots),
      updatedAt: new Date(now),
    });
  });
}

/** Close any cycle whose end date has passed. Called at the start of forum requests. */
export async function closeEndedCycles(db, schoolId, now = Date.now()) {
  const cycles = await loadSchoolDocs(db, C.CYCLES, schoolId);
  const ended = cyclesNeedingClose(cycles, now);
  for (const cycle of ended) {
    await closeCycleTx(db, schoolId, cycle.id, now);
  }
  return ended.length ? loadSchoolDocs(db, C.CYCLES, schoolId) : cycles;
}

const byStartDesc = (a, b) => (toMillis(b.startsAt) ?? 0) - (toMillis(a.startsAt) ?? 0);

// ---------------------------------------------------------------------------
// Student: board, posting, voting
// ---------------------------------------------------------------------------

/**
 * Everything the board page needs in one call.
 * @param {Db} db
 * @param {ForumContext} ctx
 */
export async function getForumOverview(db, ctx, now = Date.now()) {
  const school = getForumSchool(ctx.schoolId);
  const base = {
    school: school ? { id: school.id, name: school.name, shortName: school.shortName } : null,
    role: ctx.role,
    onRoster: ctx.onRoster,
    capabilities: forumCapabilities(ctx),
    schools: ctx.isSiteAdmin ? listForumSchools() : undefined,
  };
  if (!forumCan(ctx, A.VIEW_BOARD)) {
    return { ...base, cycle: null, nextCycle: null, latestResults: null, concerns: [], myVotes: [], maxVotes: MAX_VOTES_PER_CYCLE };
  }

  const cycles = await closeEndedCycles(db, ctx.schoolId, now);
  const openCycle = findOpenCycle(cycles, now);
  const nextCycle = cycles
    .filter((c) => cyclePhase(c, now) === CYCLE_PHASES.SCHEDULED)
    .sort((a, b) => (toMillis(a.startsAt) ?? 0) - (toMillis(b.startsAt) ?? 0))[0];
  const lastClosed = cycles.filter((c) => cyclePhase(c, now) === CYCLE_PHASES.CLOSED).sort(byStartDesc)[0];

  const [concerns, responses, ballots] = await Promise.all([
    loadSchoolDocs(db, C.CONCERNS, ctx.schoolId),
    loadSchoolDocs(db, C.RESPONSES, ctx.schoolId),
    openCycle
      ? db.collection(C.BALLOTS).where("cycleId", "==", openCycle.id).get().then((s) => s.docs.map((d) => d.data()))
      : Promise.resolve([]),
  ]);

  const counts = tallyBallots(ballots);
  const myBallot = ballots.find((b) => b.uid === ctx.uid);
  const myVotes = normalizeBallotIds(myBallot?.concernIds);
  const responsesByConcern = groupResponses(responses);

  const board = concerns
    .filter((c) => c.state === CONCERN_STATES.APPROVED)
    .map((c) =>
      toPublicConcern(c, {
        votes: openCycle && isVoteEligibleConcern(c) ? counts[c.id] || 0 : 0,
        myVote: myVotes.includes(c.id),
        responses: responsesByConcern[c.id],
      }),
    )
    .sort((a, b) => b.votes - a.votes || (a.postedOn < b.postedOn ? 1 : -1));

  return {
    ...base,
    cycle: toPublicCycle(openCycle, openCycle ? CYCLE_PHASES.OPEN : null),
    nextCycle: toPublicCycle(nextCycle, nextCycle ? CYCLE_PHASES.SCHEDULED : null),
    latestResults: lastClosed
      ? {
          cycle: toPublicCycle(lastClosed, CYCLE_PHASES.CLOSED),
          results: summarizeResults(lastClosed.ranked ?? [], lastClosed.flaggedConcernIds ?? []),
        }
      : null,
    concerns: board,
    myVotes,
    maxVotes: MAX_VOTES_PER_CYCLE,
  };
}

/**
 * @param {Db} db
 * @param {ForumContext} ctx
 * @param {{ title?: unknown, body?: unknown, category?: unknown }} input
 */
export async function submitConcern(db, ctx, input, now = Date.now()) {
  requireAction(ctx, A.POST, "Only students on your school's roster can post concerns.");
  const { title, body, category } = validateConcernInput(input);

  const concernRef = db.collection(C.CONCERNS).doc();
  const at = new Date(now);
  const concern = {
    schoolId: ctx.schoolId,
    title,
    body,
    category,
    state: CONCERN_STATES.PENDING,
    publicStatus: PUBLIC_STATUSES.OPEN,
    createdAt: at,
    updatedAt: at,
  };

  const batch = db.batch();
  batch.set(concernRef, concern);
  // Identity lives in its own collection that only the admin reveal route reads.
  batch.set(db.collection(C.AUTHORS).doc(concernRef.id), {
    schoolId: ctx.schoolId,
    concernId: concernRef.id,
    uid: ctx.uid,
    email: ctx.email,
    createdAt: at,
  });
  await batch.commit();

  return toOwnConcern({ id: concernRef.id, ...concern }, null);
}

/** The signed-in student's own posts, with moderation outcomes. */
export async function listMyConcerns(db, ctx) {
  if (!ctx.schoolId) return [];
  const authored = await db.collection(C.AUTHORS).where("uid", "==", ctx.uid).get();
  const ids = authored.docs
    .map((d) => d.data())
    .filter((a) => a.schoolId === ctx.schoolId)
    .map((a) => a.concernId);

  const [concernSnaps, privMap] = await Promise.all([
    Promise.all(ids.map((id) => db.collection(C.CONCERNS).doc(id).get())),
    loadPrivateMap(db, ids),
  ]);

  return concernSnaps
    .filter((s) => s.exists)
    .map(withId)
    .sort((a, b) => (toMillis(b.createdAt) ?? 0) - (toMillis(a.createdAt) ?? 0))
    .map((c) => toOwnConcern(c, privMap[c.id]));
}

/**
 * Add or remove one of the student's votes in the open cycle.
 * @param {{ concernId?: unknown, action?: unknown }} input
 */
export async function changeVote(db, ctx, input, now = Date.now()) {
  requireAction(ctx, A.VOTE, "Only students on your school's roster can vote.");
  const concernId = typeof input?.concernId === "string" ? input.concernId : "";
  const action = input?.action === "remove" ? "remove" : input?.action === "add" ? "add" : "";
  if (!action) throw new ForumError("Unknown vote action.");

  const cycles = await closeEndedCycles(db, ctx.schoolId, now);
  const openCycle = findOpenCycle(cycles, now);
  if (!openCycle) throw new ForumError("Voting is closed. There's no open cycle right now.", 409);

  const cycleRef = db.collection(C.CYCLES).doc(openCycle.id);
  const ballotRef = db.collection(C.BALLOTS).doc(ballotId(openCycle.id, ctx.uid));
  const concernRef = concernId ? db.collection(C.CONCERNS).doc(concernId) : null;

  return db.runTransaction(async (tx) => {
    const cycleSnap = await tx.get(cycleRef);
    const ballotSnap = await tx.get(ballotRef);
    const concernSnap = concernRef ? await tx.get(concernRef) : null;

    const cycle = cycleSnap.exists ? cycleSnap.data() : null;
    const concern = concernSnap?.exists ? concernSnap.data() : null;
    const current = ballotSnap.exists ? ballotSnap.data().concernIds : [];

    const next = applyBallotChange(
      current,
      { concernId, action },
      {
        cycleOpen: Boolean(cycle) && cycle.schoolId === ctx.schoolId && cyclePhase(cycle, now) === CYCLE_PHASES.OPEN,
        isEligible: () => Boolean(concern) && concern.schoolId === ctx.schoolId && isVoteEligibleConcern(concern),
      },
    );

    tx.set(ballotRef, {
      schoolId: ctx.schoolId,
      cycleId: openCycle.id,
      uid: ctx.uid,
      concernIds: next,
      updatedAt: new Date(now),
    });
    return { myVotes: next, votesLeft: MAX_VOTES_PER_CYCLE - next.length };
  });
}

// ---------------------------------------------------------------------------
// Moderation
// ---------------------------------------------------------------------------

/** Pending posts plus the approved board (for edits and merge targets). Never includes posters. */
export async function listModerationQueue(db, ctx) {
  requireAction(ctx, A.MODERATE, "Only SCA moderators and admins can see the moderation queue.");
  const concerns = await loadSchoolDocs(db, C.CONCERNS, ctx.schoolId);
  const visible = concerns.filter((c) =>
    [CONCERN_STATES.PENDING, CONCERN_STATES.APPROVED, CONCERN_STATES.REJECTED].includes(c.state),
  );
  const privMap = await loadPrivateMap(db, visible.map((c) => c.id));
  const toRow = (c) => toModeratorConcern(c, privMap[c.id]);
  const oldestFirst = (a, b) => (toMillis(a.createdAt) ?? 0) - (toMillis(b.createdAt) ?? 0);

  return {
    pending: visible.filter((c) => c.state === CONCERN_STATES.PENDING).sort(oldestFirst).map(toRow),
    approved: visible.filter((c) => c.state === CONCERN_STATES.APPROVED).sort(oldestFirst).map(toRow),
    rejected: visible
      .filter((c) => c.state === CONCERN_STATES.REJECTED)
      .sort((a, b) => oldestFirst(b, a))
      .slice(0, 25)
      .map(toRow),
  };
}

/**
 * Drop (or move, for merges) a concern's votes in the open cycle so voters get their vote back.
 * Must be called inside a transaction after all reads.
 */
function rewriteOpenBallots(tx, ballotDocs, concernId, mergeIntoId, now) {
  for (const doc of ballotDocs) {
    const ids = normalizeBallotIds(doc.data().concernIds);
    let next;
    if (mergeIntoId) {
      const result = remapBallotForMerge(ids, concernId, mergeIntoId);
      if (!result.changed) continue;
      next = result.ids;
    } else {
      if (!ids.includes(concernId)) continue;
      next = ids.filter((id) => id !== concernId);
    }
    tx.update(doc.ref, { concernIds: next, updatedAt: new Date(now) });
  }
}

/**
 * @param {Db} db
 * @param {ForumContext} ctx
 * @param {{ concernId?: string, action?: string, reason?: string, title?: string, body?: string,
 *   category?: string, targetId?: string, note?: string }} input
 */
export async function moderateConcern(db, ctx, input, now = Date.now()) {
  requireAction(ctx, A.MODERATE, "Only SCA moderators and admins can moderate posts.");
  const action = input?.action;
  const concernId = typeof input?.concernId === "string" ? input.concernId : "";
  if (!concernId) throw notFound();

  // Validate inputs before the transaction so field errors come back cleanly.
  let edit = null;
  let reason = "";
  let note = "";
  if (action === MODERATION_ACTIONS.EDIT) edit = validateConcernInput(input);
  if (action === MODERATION_ACTIONS.REJECT) reason = validateRejectionReason(input?.reason);
  if (action === MODERATION_ACTIONS.SAFETY) note = cleanText(input?.note, LIMITS.NOTE_MAX);
  if (
    (action === MODERATION_ACTIONS.SET_CATEGORY || action === MODERATION_ACTIONS.APPROVE) &&
    input?.category != null &&
    !isValidCategory(input.category)
  ) {
    throw new ForumError("Choose a valid category.");
  }

  const cycles = await closeEndedCycles(db, ctx.schoolId, now);
  const openCycle = findOpenCycle(cycles, now);
  const concernRef = db.collection(C.CONCERNS).doc(concernId);
  const privRef = db.collection(C.PRIVATE).doc(concernId);
  const targetId = typeof input?.targetId === "string" ? input.targetId : "";
  const targetRef = action === MODERATION_ACTIONS.MERGE && targetId ? db.collection(C.CONCERNS).doc(targetId) : null;
  const ballotsQuery = openCycle ? db.collection(C.BALLOTS).where("cycleId", "==", openCycle.id) : null;

  await db.runTransaction(async (tx) => {
    const concernSnap = await tx.get(concernRef);
    const privSnap = await tx.get(privRef);
    const targetSnap = targetRef ? await tx.get(targetRef) : null;
    const ballotDocs = ballotsQuery ? (await tx.get(ballotsQuery)).docs : [];

    const concern = concernSnap.exists ? withId(concernSnap) : null;
    const target = targetSnap?.exists ? withId(targetSnap) : null;
    assertCanModerate(ctx, concern, action, target);

    const priv = privSnap.exists ? privSnap.data() : {};
    const log = [...(Array.isArray(priv.log) ? priv.log : []), logEntry(ctx, action, now)];
    const at = new Date(now);
    const wasOnBallots = concern.state === CONCERN_STATES.APPROVED;

    switch (action) {
      case MODERATION_ACTIONS.APPROVE:
        tx.update(concernRef, {
          state: CONCERN_STATES.APPROVED,
          ...(input?.category ? { category: input.category } : {}),
          approvedAt: at,
          moderatedAt: at,
          updatedAt: at,
        });
        tx.set(privRef, { schoolId: ctx.schoolId, log }, { merge: true });
        break;

      case MODERATION_ACTIONS.REJECT:
        tx.update(concernRef, {
          state: CONCERN_STATES.REJECTED,
          rejectedAt: at,
          moderatedAt: at,
          updatedAt: at,
        });
        tx.set(privRef, { schoolId: ctx.schoolId, rejectionReason: reason, log }, { merge: true });
        if (wasOnBallots) rewriteOpenBallots(tx, ballotDocs, concern.id, null, now);
        break;

      case MODERATION_ACTIONS.EDIT: {
        // Keep the poster's first wording; later edits don't overwrite it.
        const original = priv.originalTitle || priv.originalBody
          ? {}
          : { originalTitle: concern.title, originalBody: concern.body };
        tx.update(concernRef, { ...edit, updatedAt: at });
        tx.set(privRef, { schoolId: ctx.schoolId, ...original, log }, { merge: true });
        break;
      }

      case MODERATION_ACTIONS.MERGE:
        tx.update(concernRef, {
          state: CONCERN_STATES.MERGED,
          mergedIntoId: target.id,
          moderatedAt: at,
          updatedAt: at,
        });
        tx.update(targetRef, {
          mergedFromIds: [...new Set([...(target.mergedFromIds ?? []), concern.id, ...(concern.mergedFromIds ?? [])])],
          updatedAt: at,
        });
        tx.set(privRef, { schoolId: ctx.schoolId, log }, { merge: true });
        rewriteOpenBallots(tx, ballotDocs, concern.id, target.id, now);
        break;

      case MODERATION_ACTIONS.SAFETY:
        tx.update(concernRef, {
          state: CONCERN_STATES.SAFETY,
          safetyFlaggedAt: at,
          moderatedAt: at,
          updatedAt: at,
        });
        tx.set(
          privRef,
          { schoolId: ctx.schoolId, ...(note ? { safetyNote: note } : {}), log },
          { merge: true },
        );
        if (wasOnBallots) rewriteOpenBallots(tx, ballotDocs, concern.id, null, now);
        break;

      case MODERATION_ACTIONS.SET_CATEGORY:
        if (!isValidCategory(input?.category)) throw new ForumError("Choose a valid category.");
        tx.update(concernRef, { category: input.category, updatedAt: at });
        tx.set(privRef, { schoolId: ctx.schoolId, log }, { merge: true });
        break;

      default:
        throw new ForumError("Unknown moderation action.");
    }
  });

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Admin: identity, safety, status, cycles, metrics, staff
// ---------------------------------------------------------------------------

/**
 * Admin-only: who posted a concern. Every reveal is logged.
 * @param {{ concernId?: unknown, reason?: unknown }} input
 */
export async function revealPosterIdentity(db, ctx, input, now = Date.now()) {
  requireAction(ctx, A.VIEW_IDENTITY, "Only forum admins can see who posted a concern.");
  const concern = await loadConcern(db, ctx, input?.concernId);
  const reason = cleanText(input?.reason, LIMITS.NOTE_MAX);
  if (reason.length < 5) throw new ForumError("Say briefly why you need to see who posted this.");

  const authorSnap = await db.collection(C.AUTHORS).doc(concern.id).get();
  if (!authorSnap.exists) throw notFound("No poster is on file for this concern.");
  const author = authorSnap.data();
  if (author.schoolId !== ctx.schoolId) throw notFound();

  await db.collection(C.IDENTITY_ACCESS_LOG).doc().set({
    schoolId: ctx.schoolId,
    concernId: concern.id,
    byEmail: ctx.email,
    reason,
    at: new Date(now),
  });

  const school = getForumSchool(ctx.schoolId);
  return toIdentityReveal(author, school?.lookupName(author.email) ?? null);
}

export async function listSafetyQueue(db, ctx) {
  requireAction(ctx, A.VIEW_SAFETY_QUEUE, "Only forum admins can see safety concerns.");
  const concerns = (await loadSchoolDocs(db, C.CONCERNS, ctx.schoolId)).filter(
    (c) => c.state === CONCERN_STATES.SAFETY,
  );
  const privMap = await loadPrivateMap(db, concerns.map((c) => c.id));
  return concerns
    .sort((a, b) => (toMillis(b.safetyFlaggedAt) ?? 0) - (toMillis(a.safetyFlaggedAt) ?? 0))
    .map((c) => toAdminConcern(c, privMap[c.id]));
}

/** Admin marks a safety concern as handled, with a private note. */
export async function reviewSafetyConcern(db, ctx, input, now = Date.now()) {
  requireAction(ctx, A.VIEW_SAFETY_QUEUE, "Only forum admins can handle safety concerns.");
  const concern = await loadConcern(db, ctx, input?.concernId);
  if (concern.state !== CONCERN_STATES.SAFETY) throw new ForumError("This post isn't a safety concern.", 409);
  const note = cleanText(input?.note, LIMITS.NOTE_MAX);
  if (note.length < 5) throw new ForumError("Add a short private note on how this was handled.");

  const privRef = db.collection(C.PRIVATE).doc(concern.id);
  const privSnap = await privRef.get();
  const priv = privSnap.exists ? privSnap.data() : {};
  await privRef.set(
    {
      schoolId: ctx.schoolId,
      safetyNote: note,
      safetyReviewedAt: new Date(now),
      log: [...(Array.isArray(priv.log) ? priv.log : []), logEntry(ctx, "safetyReviewed", now)],
    },
    { merge: true },
  );
  return { ok: true };
}

/** Approved concerns with their status history, for the admin status board. */
export async function listStatusBoard(db, ctx) {
  requireAction(ctx, A.CHANGE_STATUS, "Only forum admins can update statuses.");
  const [concerns, responses] = await Promise.all([
    loadSchoolDocs(db, C.CONCERNS, ctx.schoolId),
    loadSchoolDocs(db, C.RESPONSES, ctx.schoolId),
  ]);
  const approved = concerns.filter((c) => c.state === CONCERN_STATES.APPROVED);
  const privMap = await loadPrivateMap(db, approved.map((c) => c.id));
  const byConcern = groupResponses(responses);
  return approved
    .sort((a, b) => (toMillis(a.createdAt) ?? 0) - (toMillis(b.createdAt) ?? 0))
    .map((c) => ({
      ...toAdminConcern(c, privMap[c.id]),
      responses: (byConcern[c.id] ?? []).map((r) => ({
        status: r.publicStatus,
        text: r.text,
        createdAt: r.createdAt ? new Date(toMillis(r.createdAt)).toISOString() : null,
      })),
    }));
}

/**
 * Change a concern's public status. Anything other than Open → Presented needs a public response.
 * @param {{ concernId?: unknown, status?: unknown, response?: unknown }} input
 */
export async function changeConcernStatus(db, ctx, input, now = Date.now()) {
  requireAction(ctx, A.CHANGE_STATUS, "Only forum admins can update statuses.");
  const concern = await loadConcern(db, ctx, input?.concernId);
  if (concern.state !== CONCERN_STATES.APPROVED) {
    throw new ForumError("Only concerns on the board have a public status.", 409);
  }
  const from = concern.publicStatus ?? PUBLIC_STATUSES.OPEN;
  const { to, response } = validateStatusChange({ from, to: input?.status, response: input?.response });

  const cycles = await closeEndedCycles(db, ctx.schoolId, now);
  const openCycle = findOpenCycle(cycles, now);
  const concernRef = db.collection(C.CONCERNS).doc(concern.id);
  const ballotsQuery = openCycle ? db.collection(C.BALLOTS).where("cycleId", "==", openCycle.id) : null;
  const at = new Date(now);

  await db.runTransaction(async (tx) => {
    const ballotDocs = ballotsQuery ? (await tx.get(ballotsQuery)).docs : [];
    tx.update(concernRef, {
      publicStatus: to,
      statusUpdatedAt: at,
      updatedAt: at,
      ...(to === PUBLIC_STATUSES.PRESENTED && !concern.presentedAt ? { presentedAt: at } : {}),
      ...(to === PUBLIC_STATUSES.RESOLVED ? { resolvedAt: at } : {}),
    });
    if (response) {
      tx.set(db.collection(C.RESPONSES).doc(), {
        schoolId: ctx.schoolId,
        concernId: concern.id,
        publicStatus: to,
        text: response,
        byEmail: ctx.email,
        createdAt: at,
      });
    }
    // A concern that leaves "Open" mid-cycle can't be voted on; give those votes back.
    if (from === PUBLIC_STATUSES.OPEN) rewriteOpenBallots(tx, ballotDocs, concern.id, null, now);
  });
  return { ok: true };
}

/** Cycles with results (closed) or live ranking (open), for moderators and admins. */
export async function listCycles(db, ctx, now = Date.now()) {
  requireAction(ctx, A.FLAG_FOR_PRESENTATION, "Only SCA moderators and admins can see cycle results.");
  const cycles = (await closeEndedCycles(db, ctx.schoolId, now)).sort(byStartDesc);
  const openCycle = findOpenCycle(cycles, now);

  let liveRanked = [];
  if (openCycle) {
    const [concerns, ballotSnap] = await Promise.all([
      loadSchoolDocs(db, C.CONCERNS, ctx.schoolId),
      db.collection(C.BALLOTS).where("cycleId", "==", openCycle.id).get(),
    ]);
    const ballots = ballotSnap.docs.map((d) => d.data());
    liveRanked = rankConcerns(concerns.filter(isVoteEligibleConcern), tallyBallots(ballots));
  }

  return cycles.map((cycle) => {
    const phase = cyclePhase(cycle, now);
    const flagged = cycle.flaggedConcernIds ?? [];
    const ranked = phase === CYCLE_PHASES.CLOSED ? cycle.ranked ?? [] : cycle.id === openCycle?.id ? liveRanked : [];
    return {
      ...toPublicCycle(cycle, phase),
      flaggedConcernIds: flagged,
      uniqueVoters: phase === CYCLE_PHASES.CLOSED ? cycle.uniqueVoters ?? 0 : null,
      ranked,
      summary: summarizeResults(ranked, flagged),
    };
  });
}

/** @param {{ label?: unknown, startsAt?: unknown, endsAt?: unknown }} input */
export async function createCycle(db, ctx, input, now = Date.now()) {
  requireAction(ctx, A.MANAGE_CYCLES, "Only forum admins can create cycles.");
  const cycles = await closeEndedCycles(db, ctx.schoolId, now);
  const { startMs, endMs } = validateNewCycle(input, cycles, now);
  const label =
    cleanText(input?.label, 80) ||
    `Cycle ${cycles.length + 1}`;
  const ref = db.collection(C.CYCLES).doc();
  await ref.set({
    schoolId: ctx.schoolId,
    label,
    startsAt: new Date(startMs),
    endsAt: new Date(endMs),
    flaggedConcernIds: [],
    createdByEmail: ctx.email,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  });
  return { id: ref.id };
}

export async function closeCycleNow(db, ctx, input, now = Date.now()) {
  requireAction(ctx, A.MANAGE_CYCLES, "Only forum admins can close cycles.");
  const cycleId = typeof input?.cycleId === "string" ? input.cycleId : "";
  if (!cycleId) throw notFound("That cycle could not be found.");
  const snap = await db.collection(C.CYCLES).doc(cycleId).get();
  if (!snap.exists || snap.data().schoolId !== ctx.schoolId) throw notFound("That cycle could not be found.");
  const phase = cyclePhase(snap.data(), now);
  if (phase === CYCLE_PHASES.SCHEDULED) {
    // Not started yet: nothing to close, just remove it.
    await snap.ref.delete();
    return { ok: true, deleted: true };
  }
  await closeCycleTx(db, ctx.schoolId, cycleId, now);
  return { ok: true };
}

/** Include (or stop including) a concern in a cycle's presentation regardless of votes. */
export async function setPresentationFlag(db, ctx, input, now = Date.now()) {
  requireAction(ctx, A.FLAG_FOR_PRESENTATION, "Only SCA moderators and admins can flag concerns for the presentation.");
  const cycleId = typeof input?.cycleId === "string" ? input.cycleId : "";
  const cycleRef = db.collection(C.CYCLES).doc(cycleId || "_");
  const concern = await loadConcern(db, ctx, input?.concernId);
  if (concern.state !== CONCERN_STATES.APPROVED) throw new ForumError("Only concerns on the board can be flagged.", 409);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(cycleRef);
    if (!snap.exists || snap.data().schoolId !== ctx.schoolId) throw notFound("That cycle could not be found.");
    const current = snap.data().flaggedConcernIds ?? [];
    const next = input?.flagged
      ? [...new Set([...current, concern.id])]
      : current.filter((id) => id !== concern.id);
    tx.update(cycleRef, { flaggedConcernIds: next, updatedAt: new Date(now) });
  });
  return { ok: true };
}

export async function getMetrics(db, ctx, now = Date.now()) {
  requireAction(ctx, A.VIEW_METRICS, "Only forum admins can see metrics.");
  const cycles = await closeEndedCycles(db, ctx.schoolId, now);
  const [concerns, ballots] = await Promise.all([
    loadSchoolDocs(db, C.CONCERNS, ctx.schoolId),
    loadSchoolDocs(db, C.BALLOTS, ctx.schoolId),
  ]);
  const ballotsByCycle = {};
  for (const b of ballots) (ballotsByCycle[b.cycleId] ||= []).push(b);

  const started = cycles
    .filter((c) => cyclePhase(c, now) !== CYCLE_PHASES.SCHEDULED)
    .sort((a, b) => (toMillis(a.startsAt) ?? 0) - (toMillis(b.startsAt) ?? 0));
  return started.map((c, i) =>
    computeCycleMetrics(c, concerns, ballotsByCycle[c.id] ?? [], { windowEnd: started[i + 1]?.startsAt }),
  );
}

// --- Staff ---------------------------------------------------------------

const staffDocId = (schoolId, email) => `${schoolId}__${email}`;

/** Forum admins manage their own school; site admins may manage any school. */
function resolveStaffSchool(ctx, requestedSchoolId) {
  requireAction(ctx, A.MANAGE_STAFF, "Only forum admins can manage moderators and admins.");
  const schoolId = requestedSchoolId || ctx.schoolId;
  if (!ctx.isSiteAdmin && (schoolId !== ctx.schoolId || ctx.role !== FORUM_ROLES.ADMIN)) {
    throw forbidden("You can only manage staff at your own school.");
  }
  if (!getForumSchool(schoolId)) throw new ForumError("Choose a school.");
  return schoolId;
}

export async function listStaff(db, ctx, input) {
  const schoolId = resolveStaffSchool(ctx, input?.schoolId);
  const rows = await loadSchoolDocs(db, C.STAFF, schoolId);
  return rows
    .map(toStaffRow)
    .sort((a, b) => a.role.localeCompare(b.role) || a.email.localeCompare(b.email));
}

/** @param {{ schoolId?: string, email?: unknown, role?: unknown }} input */
export async function setStaffRole(db, ctx, input, now = Date.now()) {
  const schoolId = resolveStaffSchool(ctx, input?.schoolId);
  const email = normalizeEmail(typeof input?.email === "string" ? input.email : "");
  if (!isValidEmail(email)) throw new ForumError("Enter a valid school email.");
  // Forum staff can't change their own role (avoids demoting the last admin by accident).
  // Site admins may appoint themselves — needed to bootstrap the first forum admin.
  if (email === ctx.email && !ctx.isSiteAdmin) {
    throw new ForumError("You can't change your own role.");
  }
  const role = input?.role;
  const ref = db.collection(C.STAFF).doc(staffDocId(schoolId, email));

  if (role === "none") {
    await ref.delete();
    return { ok: true };
  }
  if (role !== FORUM_ROLES.MODERATOR && role !== FORUM_ROLES.ADMIN) {
    throw new ForumError("Choose moderator or admin.");
  }
  // One school per staff member keeps role resolution unambiguous.
  const existing = await db.collection(C.STAFF).where("email", "==", email).get();
  if (existing.docs.some((d) => d.data().schoolId !== schoolId)) {
    throw new ForumError("That person is already staff at another school.", 409);
  }
  await ref.set({ schoolId, email, role, addedByEmail: ctx.email, addedAt: new Date(now) });
  return { ok: true };
}
