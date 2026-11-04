/**
 * Every forum API response is built here. Each serializer copies an explicit allowlist of fields
 * (never spreads a stored document), so poster identity can't leak through a field added later.
 * Identity is only ever returned by `toIdentityReveal`, which only the admin reveal route calls.
 */
import {
  CONCERN_STATES,
  PUBLIC_STATUSES,
  SAFETY_MESSAGE,
} from "@/lib/school-forum/constants";
import { toIso, toPublicDay } from "@/lib/school-forum/dates";

/** @param {{ publicStatus?: string, text?: string, createdAt?: unknown }} r */
function toPublicResponse(r) {
  return {
    status: r.publicStatus ?? null,
    text: typeof r.text === "string" ? r.text : "",
    postedOn: toPublicDay(r.createdAt),
  };
}

/**
 * Public board card. Visible to every student at the school.
 * @param {Record<string, unknown> & { id: string }} concern
 * @param {{ votes?: number, responses?: object[], myVote?: boolean, votingOpen?: boolean }} [extra]
 */
export function toPublicConcern(concern, extra = {}) {
  return {
    id: concern.id,
    title: String(concern.title ?? ""),
    body: String(concern.body ?? ""),
    category: concern.category ?? null,
    publicStatus: concern.publicStatus ?? PUBLIC_STATUSES.OPEN,
    postedOn: toPublicDay(concern.approvedAt ?? concern.createdAt),
    mergedCount: Array.isArray(concern.mergedFromIds) ? concern.mergedFromIds.length : 0,
    votes: extra.votes ?? 0,
    myVote: Boolean(extra.myVote),
    responses: (extra.responses ?? []).map(toPublicResponse),
  };
}

/**
 * Moderation queue item. Moderators see the text, edits and moderation history — never the poster.
 * @param {Record<string, unknown> & { id: string }} concern
 * @param {Record<string, unknown> | null} priv forumConcernPrivate doc
 */
export function toModeratorConcern(concern, priv) {
  const edited = Boolean(priv?.originalTitle || priv?.originalBody);
  return {
    id: concern.id,
    title: String(concern.title ?? ""),
    body: String(concern.body ?? ""),
    category: concern.category ?? null,
    state: concern.state ?? CONCERN_STATES.PENDING,
    publicStatus: concern.publicStatus ?? PUBLIC_STATUSES.OPEN,
    submittedAt: toIso(concern.createdAt),
    moderatedAt: toIso(concern.moderatedAt),
    edited,
    original: edited
      ? {
          title: String(priv?.originalTitle ?? concern.title ?? ""),
          body: String(priv?.originalBody ?? concern.body ?? ""),
        }
      : null,
    rejectionReason: typeof priv?.rejectionReason === "string" ? priv.rejectionReason : null,
    mergedIntoId: typeof concern.mergedIntoId === "string" ? concern.mergedIntoId : null,
    mergedCount: Array.isArray(concern.mergedFromIds) ? concern.mergedFromIds.length : 0,
  };
}

/**
 * Admin views (safety queue, status board). Same as moderators plus the private safety note;
 * identity still needs an explicit, logged reveal.
 */
export function toAdminConcern(concern, priv) {
  return {
    ...toModeratorConcern(concern, priv),
    safetyNote: typeof priv?.safetyNote === "string" ? priv.safetyNote : null,
    safetyReviewedAt: toIso(priv?.safetyReviewedAt),
  };
}

const OWN_STATE_LABELS = {
  pending: "Waiting for review",
  approved: "On the board",
  rejected: "Not approved",
  merged: "Combined with a similar concern",
  safety: "Sent to school staff",
};

/**
 * The poster's own "My posts" view.
 * @param {Record<string, unknown> & { id: string }} concern
 * @param {Record<string, unknown> | null} priv
 */
export function toOwnConcern(concern, priv) {
  const state = concern.state ?? CONCERN_STATES.PENDING;
  return {
    id: concern.id,
    title: String(concern.title ?? ""),
    body: String(concern.body ?? ""),
    category: concern.category ?? null,
    state,
    stateLabel: OWN_STATE_LABELS[state] ?? state,
    publicStatus: state === CONCERN_STATES.APPROVED ? concern.publicStatus ?? PUBLIC_STATUSES.OPEN : null,
    submittedOn: toPublicDay(concern.createdAt),
    editedByModerator: Boolean(priv?.originalTitle || priv?.originalBody),
    rejectionReason:
      state === CONCERN_STATES.REJECTED && typeof priv?.rejectionReason === "string"
        ? priv.rejectionReason
        : null,
    safetyMessage: state === CONCERN_STATES.SAFETY ? SAFETY_MESSAGE : null,
    mergedIntoId:
      state === CONCERN_STATES.MERGED && typeof concern.mergedIntoId === "string"
        ? concern.mergedIntoId
        : null,
  };
}

/**
 * Admin-only: who posted a concern.
 * @param {{ email?: string }} author
 * @param {string | null} name roster name, if known
 */
export function toIdentityReveal(author, name) {
  return {
    email: typeof author?.email === "string" ? author.email : null,
    name: name || null,
  };
}

/** Cycle as shown to everyone. */
export function toPublicCycle(cycle, phase) {
  if (!cycle) return null;
  return {
    id: cycle.id,
    label: String(cycle.label ?? ""),
    startsAt: toIso(cycle.startsAt),
    endsAt: toIso(cycle.endsAt),
    closedAt: toIso(cycle.closedAt),
    phase,
  };
}

/** Staff appointment row (staff aren't anonymous, so their email is shown to admins). */
export function toStaffRow(record) {
  return {
    email: String(record.email ?? ""),
    role: record.role,
    schoolId: record.schoolId,
    addedAt: toIso(record.addedAt),
  };
}
