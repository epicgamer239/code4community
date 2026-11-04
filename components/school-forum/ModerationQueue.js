"use client";

import { useCallback, useId, useState } from "react";
import { useRunEffect } from "@/hooks/useRunEffect";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import {
  CategoryBadge,
  FieldError,
  LiveMessage,
  Notice,
  StatusBadge,
  TabPanel,
  Tabs,
  btnDanger,
  btnPrimary,
  btnSecondary,
  cardClass,
  formatDate,
  inputClass,
  labelClass,
} from "@/components/school-forum/ui";
import {
  CONCERN_CATEGORY_LABELS,
  LIMITS,
} from "@/lib/school-forum/constants";
import { forumFetch } from "@/lib/school-forum/forumClient";

const ACTIONS_BY_STATE = {
  pending: ["approve", "edit", "merge", "reject", "safety"],
  approved: ["edit", "merge", "reject", "safety"],
  rejected: ["safety"],
};

const ACTION_LABELS = {
  approve: "Approve",
  edit: "Edit for clarity",
  merge: "Merge duplicate",
  reject: "Reject",
  safety: "Safety concern",
};

function CategorySelect({ id, value, onChange }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} mt-1`}>
      {Object.entries(CONCERN_CATEGORY_LABELS).map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}

function ActionPanel({ action, concern, mergeTargets, onSubmit, onCancel, busy, fieldErrors }) {
  const id = useId();
  const [category, setCategory] = useState(concern.category || "school");
  const [title, setTitle] = useState(concern.title);
  const [body, setBody] = useState(concern.body);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [targetId, setTargetId] = useState(mergeTargets[0]?.id ?? "");

  const submit = (event) => {
    event.preventDefault();
    const payload = { approve: { category }, edit: { title, body, category }, reject: { reason }, safety: { note }, merge: { targetId } }[action];
    onSubmit(action, payload);
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border border-border bg-slate-50 p-4" aria-label={`${ACTION_LABELS[action]}: ${concern.title}`}>
      {action === "approve" ? (
        <div>
          <label htmlFor={`${id}-cat`} className={labelClass}>Category</label>
          <CategorySelect id={`${id}-cat`} value={category} onChange={setCategory} />
        </div>
      ) : null}

      {action === "edit" ? (
        <>
          <p className="text-sm text-slate-700">Fix spelling, remove names, or make it clearer. The poster&apos;s original wording is kept for reference.</p>
          <div>
            <label htmlFor={`${id}-title`} className={labelClass}>Title</label>
            <input id={`${id}-title`} value={title} maxLength={LIMITS.TITLE_MAX} onChange={(e) => setTitle(e.target.value)} aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? `${id}-title-err` : undefined} className={`${inputClass} mt-1`} />
            <FieldError id={`${id}-title-err`} message={fieldErrors.title} />
          </div>
          <div>
            <label htmlFor={`${id}-cat`} className={labelClass}>Category</label>
            <CategorySelect id={`${id}-cat`} value={category} onChange={setCategory} />
          </div>
          <div>
            <label htmlFor={`${id}-body`} className={labelClass}>Description</label>
            <textarea id={`${id}-body`} rows={5} value={body} maxLength={LIMITS.BODY_MAX} onChange={(e) => setBody(e.target.value)} aria-invalid={Boolean(fieldErrors.body)} aria-describedby={fieldErrors.body ? `${id}-body-err` : undefined} className={`${inputClass} mt-1`} />
            <FieldError id={`${id}-body-err`} message={fieldErrors.body} />
          </div>
        </>
      ) : null}

      {action === "reject" ? (
        <div>
          <label htmlFor={`${id}-reason`} className={labelClass}>Reason (shown to the poster)</label>
          <p id={`${id}-reason-hint`} className="text-sm text-slate-700">Be kind and specific, e.g. &quot;Please don&apos;t name staff members. Feel free to repost without the name.&quot;</p>
          <textarea id={`${id}-reason`} rows={3} value={reason} maxLength={LIMITS.REASON_MAX} onChange={(e) => setReason(e.target.value)} aria-describedby={`${id}-reason-hint`} className={`${inputClass} mt-1`} />
        </div>
      ) : null}

      {action === "merge" ? (
        mergeTargets.length ? (
          <div>
            <label htmlFor={`${id}-target`} className={labelClass}>Merge into this concern on the board</label>
            <p id={`${id}-target-hint`} className="text-sm text-slate-700">This post is hidden and its votes in the current cycle move to the concern you choose.</p>
            <select id={`${id}-target`} value={targetId} onChange={(e) => setTargetId(e.target.value)} aria-describedby={`${id}-target-hint`} className={`${inputClass} mt-1`}>
              {mergeTargets.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-sm text-slate-700">There are no approved concerns to merge into yet.</p>
        )
      ) : null}

      {action === "safety" ? (
        <>
          <Notice kind="info">
            Use this for bullying, threats, self-harm, or anyone being hurt. The post will never be published. It goes privately to forum admins, and the poster is told to talk to a counselor or trusted adult. If someone is in immediate danger, tell a staff member now.
          </Notice>
          <div>
            <label htmlFor={`${id}-note`} className={labelClass}>Note for admins (optional)</label>
            <textarea id={`${id}-note`} rows={3} value={note} maxLength={LIMITS.NOTE_MAX} onChange={(e) => setNote(e.target.value)} className={`${inputClass} mt-1`} />
          </div>
        </>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy || (action === "merge" && !targetId)} className={action === "reject" || action === "safety" ? btnDanger : btnPrimary}>
          {busy ? "Saving…" : `Confirm: ${ACTION_LABELS[action]}`}
        </button>
        <button type="button" onClick={onCancel} className={btnSecondary}>Cancel</button>
      </div>
    </form>
  );
}

function ModerationCard({ concern, mergeTargets, onAction }) {
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const headingId = `mod-${concern.id}`;

  const submit = async (action, payload) => {
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      await onAction(concern, action, payload);
      setOpen(null);
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.fieldErrors || {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <article aria-labelledby={headingId} className={cardClass}>
      <div className="flex flex-wrap items-center gap-2">
        <CategoryBadge category={concern.category} />
        {concern.state === "approved" ? <StatusBadge status={concern.publicStatus} /> : null}
        {concern.edited ? <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800">Edited</span> : null}
        {concern.mergedCount ? <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800">{concern.mergedCount} merged</span> : null}
      </div>
      <h3 id={headingId} className="mt-3 text-lg font-bold text-foreground">{concern.title}</h3>
      <p className="mt-1 whitespace-pre-line text-slate-800">{concern.body}</p>
      <p className="mt-2 text-sm text-slate-700">Submitted {formatDate(concern.submittedAt, { withTime: true })} · Poster hidden</p>
      {concern.original ? (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer font-semibold text-foreground">Show original wording</summary>
          <p className="mt-1 font-semibold">{concern.original.title}</p>
          <p className="whitespace-pre-line text-slate-800">{concern.original.body}</p>
        </details>
      ) : null}
      {concern.rejectionReason && concern.state === "rejected" ? (
        <p className="mt-2 text-sm text-red-800">Rejected: {concern.rejectionReason}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={`Actions for ${concern.title}`}>
        {(ACTIONS_BY_STATE[concern.state] ?? []).map((action) => (
          <button
            key={action}
            type="button"
            aria-expanded={open === action}
            onClick={() => {
              setOpen(open === action ? null : action);
              setError("");
            }}
            className={action === "approve" ? btnPrimary : btnSecondary}
          >
            {action === "reject" && concern.state === "approved" ? "Take down" : ACTION_LABELS[action]}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <Notice kind="error" focus>{error}</Notice>
      </div>
      {open ? (
        <ActionPanel
          key={open}
          action={open}
          concern={concern}
          mergeTargets={mergeTargets.filter((t) => t.id !== concern.id)}
          onSubmit={submit}
          onCancel={() => setOpen(null)}
          busy={busy}
          fieldErrors={fieldErrors}
        />
      ) : null}
    </article>
  );
}

const DONE_MESSAGES = {
  approve: "Approved. It's now on the board.",
  edit: "Edit saved. The original wording is kept.",
  merge: "Merged. Votes now count toward the combined concern.",
  reject: "Rejected. The poster will see your reason.",
  safety: "Flagged as a safety concern and sent privately to admins.",
};

/** Moderators and admins: review new posts and manage the board. Poster identity is never loaded here. */
export default function ModerationQueue({ user }) {
  const [queue, setQueue] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("pending");

  const load = useCallback(async () => {
    try {
      setQueue(await forumFetch(user, "/moderation"));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [user]);

  useRunEffect(() => {
    void load();
  }, [load]);

  const onAction = async (concern, action, payload) => {
    await forumFetch(user, "/moderation", { method: "POST", body: { concernId: concern.id, action, ...payload } });
    setMessage(`"${concern.title}": ${DONE_MESSAGES[action]}`);
    await load();
  };

  if (error) return <Notice kind="error" focus>{error}</Notice>;
  if (!queue) return <LoadingSpinner text="Loading the queue" />;

  const lists = { pending: queue.pending, approved: queue.approved, rejected: queue.rejected };
  const empty = {
    pending: "No posts are waiting for review.",
    approved: "Nothing is on the board yet.",
    rejected: "No recently rejected posts.",
  };

  return (
    <section aria-labelledby="mod-queue-heading" className="space-y-4">
      <h2 id="mod-queue-heading" className="text-2xl font-bold text-foreground">Moderation queue</h2>
      <LiveMessage message={message} />
      <Tabs
        label="Moderation lists"
        idPrefix="mod"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "pending", label: "Waiting for review", count: queue.pending.length },
          { id: "approved", label: "On the board", count: queue.approved.length },
          { id: "rejected", label: "Rejected" },
        ]}
      />
      {Object.entries(lists).map(([key, list]) => (
        <TabPanel key={key} idPrefix="mod" id={key} active={tab}>
          {list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-400 bg-slate-50 p-8 text-center text-slate-700">{empty[key]}</div>
          ) : (
            <ul className="space-y-4">
              {list.map((concern) => (
                <li key={concern.id}>
                  <ModerationCard concern={concern} mergeTargets={queue.approved} onAction={onAction} />
                </li>
              ))}
            </ul>
          )}
        </TabPanel>
      ))}
    </section>
  );
}
