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
  btnPrimary,
  btnSecondary,
  cardClass,
  formatDate,
  inputClass,
  labelClass,
} from "@/components/school-forum/ui";
import {
  LIMITS,
  PUBLIC_STATUS_LABELS,
} from "@/lib/school-forum/constants";
import { downloadForumMetricsCsv, forumFetch } from "@/lib/school-forum/forumClient";
import { METRICS_COLUMNS } from "@/lib/school-forum/metrics";
import { statusChangeRequiresResponse } from "@/lib/school-forum/statusTransitions";

function useForumList(user, path, key) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const res = await forumFetch(user, path);
      setData(res[key]);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [user, path, key]);
  useRunEffect(() => {
    void load();
  }, [load]);
  return { data, error, load };
}

/**
 * Admin-only "who posted this" control. Asks for a reason first; every reveal is logged on the server.
 * The identity lives only in this component's state and is never cached.
 */
export function IdentityReveal({ user, concernId, concernTitle }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [poster, setPoster] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await forumFetch(user, "/admin/identity", { method: "POST", body: { concernId, reason } });
      setPoster(res.poster);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (poster) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p>
          <strong>Posted by:</strong> {poster.name ?? "Name not on roster"} ({poster.email ?? "unknown"})
        </p>
        <button type="button" className={btnSecondary} onClick={() => { setPoster(null); setOpen(false); setReason(""); }}>
          Hide
        </button>
      </div>
    );
  }
  if (!open) {
    return (
      <button type="button" className={`${btnSecondary} mt-3`} onClick={() => setOpen(true)} aria-label={`See who posted "${concernTitle}"`}>
        See who posted
      </button>
    );
  }
  return (
    <form onSubmit={submit} className="mt-3 space-y-2 rounded-lg border border-border bg-slate-50 p-3">
      <label htmlFor={`${id}-reason`} className={labelClass}>Why do you need to see who posted this?</label>
      <p id={`${id}-hint`} className="text-xs text-slate-700">This is logged with your name. Only look when there is a safety or misuse reason.</p>
      <input id={`${id}-reason`} value={reason} maxLength={LIMITS.NOTE_MAX} onChange={(e) => setReason(e.target.value)} aria-describedby={`${id}-hint${error ? ` ${id}-err` : ""}`} aria-invalid={Boolean(error)} className={inputClass} />
      <FieldError id={`${id}-err`} message={error} />
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={btnPrimary}>{busy ? "Checking…" : "Show poster"}</button>
        <button type="button" className={btnSecondary} onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------

function StatusForm({ user, concern, onSaved }) {
  const id = useId();
  const options = Object.keys(PUBLIC_STATUS_LABELS).filter((s) => s !== concern.publicStatus);
  const [to, setTo] = useState(options[0]);
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const needsResponse = statusChangeRequiresResponse(concern.publicStatus, to);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await forumFetch(user, "/admin/status", { method: "POST", body: { concernId: concern.id, status: to, response } });
      setResponse("");
      onSaved(concern, to);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-[12rem_1fr]">
      <div>
        <label htmlFor={`${id}-to`} className={labelClass}>Change status to</label>
        <select id={`${id}-to`} value={to} onChange={(e) => setTo(e.target.value)} className={`${inputClass} mt-1`}>
          {options.map((s) => (
            <option key={s} value={s}>{PUBLIC_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${id}-response`} className={labelClass}>
          Public response {needsResponse ? <span className="font-normal text-slate-700">(required)</span> : <span className="font-normal text-slate-700">(optional)</span>}
        </label>
        <p id={`${id}-hint`} className="text-xs text-slate-700">Shown to all students with this concern. Explain what is happening and why.</p>
        <textarea
          id={`${id}-response`}
          rows={3}
          value={response}
          maxLength={LIMITS.RESPONSE_MAX}
          onChange={(e) => setResponse(e.target.value)}
          required={needsResponse}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-hint${error ? ` ${id}-err` : ""}`}
          className={`${inputClass} mt-1`}
        />
        <FieldError id={`${id}-err`} message={error} />
      </div>
      <div className="sm:col-span-2">
        <button type="submit" disabled={busy} className={btnPrimary}>{busy ? "Saving…" : "Update status"}</button>
      </div>
    </form>
  );
}

export function StatusBoardPanel({ user }) {
  const { data, error, load } = useForumList(user, "/admin/status", "concerns");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");
  const filterId = useId();

  if (error) return <Notice kind="error" focus>{error}</Notice>;
  if (!data) return <LoadingSpinner text="Loading the status board" />;
  const shown = data.filter((c) => filter === "all" || c.publicStatus === filter);

  return (
    <section aria-labelledby="status-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="status-heading" className="text-2xl font-bold text-foreground">Status board</h2>
        <div>
          <label htmlFor={filterId} className={labelClass}>Show</label>
          <select id={filterId} value={filter} onChange={(e) => setFilter(e.target.value)} className={`${inputClass} mt-1 w-44`}>
            <option value="all">All statuses</option>
            {Object.entries(PUBLIC_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
      <LiveMessage message={message} />
      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-400 bg-slate-50 p-8 text-center text-slate-700">No concerns with this status.</div>
      ) : (
        <ul className="space-y-4">
          {shown.map((c) => (
            <li key={c.id}>
              <article aria-labelledby={`status-${c.id}`} className={cardClass}>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={c.publicStatus} />
                  <CategoryBadge category={c.category} />
                </div>
                <h3 id={`status-${c.id}`} className="mt-3 text-lg font-bold text-foreground">{c.title}</h3>
                <p className="mt-1 whitespace-pre-line text-slate-800">{c.body}</p>
                {c.responses.length ? (
                  <ol className="mt-3 space-y-2" aria-label="Response history">
                    {c.responses.map((r, i) => (
                      <li key={i} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-950">
                        <strong>{PUBLIC_STATUS_LABELS[r.status]}</strong> · {formatDate(r.createdAt)}: {r.text}
                      </li>
                    ))}
                  </ol>
                ) : null}
                <StatusForm
                  key={c.publicStatus}
                  user={user}
                  concern={c}
                  onSaved={async (concern, to) => {
                    setMessage(`"${concern.title}" is now ${PUBLIC_STATUS_LABELS[to]}.`);
                    await load();
                  }}
                />
                <IdentityReveal user={user} concernId={c.id} concernTitle={c.title} />
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------

function SafetyReviewForm({ user, concern, onSaved }) {
  const id = useId();
  const [note, setNote] = useState(concern.safetyNote ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await forumFetch(user, "/admin/safety", { method: "POST", body: { concernId: concern.id, note } });
      onSaved(concern);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="mt-3 space-y-2">
      <label htmlFor={`${id}-note`} className={labelClass}>Private note: how was this handled?</label>
      <textarea id={`${id}-note`} rows={2} value={note} maxLength={LIMITS.NOTE_MAX} onChange={(e) => setNote(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined} className={inputClass} />
      <FieldError id={`${id}-err`} message={error} />
      <button type="submit" disabled={busy} className={btnPrimary}>{busy ? "Saving…" : concern.safetyReviewedAt ? "Update note" : "Mark as handled"}</button>
    </form>
  );
}

export function SafetyQueuePanel({ user }) {
  const { data, error, load } = useForumList(user, "/admin/safety", "concerns");
  const [message, setMessage] = useState("");
  if (error) return <Notice kind="error" focus>{error}</Notice>;
  if (!data) return <LoadingSpinner text="Loading safety concerns" />;
  return (
    <section aria-labelledby="safety-heading" className="space-y-4">
      <h2 id="safety-heading" className="text-2xl font-bold text-foreground">Safety concerns</h2>
      <Notice kind="info">
        These posts were flagged by moderators and are never published. Follow your school&apos;s safety and reporting procedures. If someone may be in danger, act now. Don&apos;t wait for the forum.
      </Notice>
      <LiveMessage message={message} />
      {data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-400 bg-slate-50 p-8 text-center text-slate-700">No safety concerns.</div>
      ) : (
        <ul className="space-y-4">
          {data.map((c) => (
            <li key={c.id}>
              <article aria-labelledby={`safety-${c.id}`} className={`${cardClass} ${c.safetyReviewedAt ? "" : "border-2 border-amber-500"}`}>
                <p className="text-sm font-semibold text-amber-900">
                  {c.safetyReviewedAt ? `Handled ${formatDate(c.safetyReviewedAt, { withTime: true })}` : "Needs attention"}
                </p>
                <h3 id={`safety-${c.id}`} className="mt-1 text-lg font-bold text-foreground">{c.title}</h3>
                <p className="mt-1 whitespace-pre-line text-slate-800">{c.body}</p>
                <p className="mt-2 text-sm text-slate-700">Submitted {formatDate(c.submittedAt, { withTime: true })}</p>
                <IdentityReveal user={user} concernId={c.id} concernTitle={c.title} />
                <SafetyReviewForm user={user} concern={c} onSaved={async (concern) => { setMessage(`Saved note for "${concern.title}".`); await load(); }} />
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------

export function MetricsPanel({ user }) {
  const { data, error } = useForumList(user, "/admin/metrics", "cycles");
  const [exportError, setExportError] = useState("");
  if (error) return <Notice kind="error" focus>{error}</Notice>;
  if (!data) return <LoadingSpinner text="Loading metrics" />;

  const totals = Object.fromEntries(
    METRICS_COLUMNS.slice(3).map(([key]) => [key, data.reduce((sum, row) => sum + (row[key] || 0), 0)]),
  );

  return (
    <section aria-labelledby="metrics-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="metrics-heading" className="text-2xl font-bold text-foreground">Pilot metrics</h2>
        <button
          type="button"
          className={btnSecondary}
          onClick={() => downloadForumMetricsCsv(user).catch((err) => setExportError(err.message))}
        >
          Download CSV
        </button>
      </div>
      <Notice kind="error" focus>{exportError}</Notice>
      <p className="text-sm text-slate-700">&quot;Unique voters&quot; is the number of students who voted at least once in that cycle.</p>
      {data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-400 bg-slate-50 p-8 text-center text-slate-700">Metrics appear once the first cycle starts.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <caption className="sr-only">Forum metrics by voting cycle</caption>
            <thead className="bg-slate-50">
              <tr>
                {METRICS_COLUMNS.filter(([k]) => k !== "endsAt").map(([key, label]) => (
                  <th key={key} scope="col" className="px-3 py-2 font-semibold text-foreground">{key === "startsAt" ? "Dates" : label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.cycleId} className="border-t border-border">
                  <th scope="row" className="px-3 py-2 font-semibold">{row.label}</th>
                  <td className="px-3 py-2">{formatDate(row.startsAt)} to {formatDate(row.endsAt)}</td>
                  {METRICS_COLUMNS.slice(3).map(([key]) => <td key={key} className="px-3 py-2">{row[key]}</td>)}
                </tr>
              ))}
              <tr className="border-t-2 border-slate-400 bg-slate-50 font-semibold">
                <th scope="row" className="px-3 py-2">All cycles</th>
                <td className="px-3 py-2" />
                {METRICS_COLUMNS.slice(3).map(([key]) => (
                  <td key={key} className="px-3 py-2">{key === "uniqueVoters" ? "—" : totals[key]}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------

export function StaffPanel({ user, overview }) {
  const id = useId();
  const schools = overview.schools ?? (overview.school ? [overview.school] : []);
  const [schoolId, setSchoolId] = useState(overview.school?.id ?? schools[0]?.id ?? "");
  const [staff, setStaff] = useState(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("moderator");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!schoolId) return;
    try {
      const res = await forumFetch(user, `/admin/staff?schoolId=${encodeURIComponent(schoolId)}`);
      setStaff(res.staff);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [user, schoolId]);

  useRunEffect(() => {
    void load();
  }, [load]);

  const save = async (targetEmail, targetRole) => {
    setError("");
    try {
      await forumFetch(user, "/admin/staff", { method: "POST", body: { schoolId, email: targetEmail, role: targetRole } });
      setMessage(targetRole === "none" ? `Removed ${targetEmail}.` : `${targetEmail} is now a ${targetRole}.`);
      setEmail("");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section aria-labelledby="staff-heading" className="space-y-4">
      <h2 id="staff-heading" className="text-2xl font-bold text-foreground">Moderators &amp; admins</h2>
      <p className="text-sm text-slate-700">
        Moderators (SCA members) review posts but never see who posted. Admins can also run cycles, post responses,
        handle safety concerns, and see who posted a concern.
      </p>
      <LiveMessage message={message} />
      <Notice kind="error" focus>{error}</Notice>
      {schools.length > 1 ? (
        <div>
          <label htmlFor={`${id}-school`} className={labelClass}>School</label>
          <select id={`${id}-school`} value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className={`${inputClass} mt-1 w-72`}>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      ) : null}
      <form
        onSubmit={(e) => { e.preventDefault(); void save(email, role); }}
        className={`${cardClass} grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end`}
      >
        <div>
          <label htmlFor={`${id}-email`} className={labelClass}>School email</label>
          <input id={`${id}-email`} type="email" required autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="123456@lcps.org" className={`${inputClass} mt-1`} />
        </div>
        <div>
          <label htmlFor={`${id}-role`} className={labelClass}>Role</label>
          <select id={`${id}-role`} value={role} onChange={(e) => setRole(e.target.value)} className={`${inputClass} mt-1`}>
            <option value="moderator">Moderator</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button type="submit" className={btnPrimary}>Add</button>
      </form>
      {!staff ? (
        <LoadingSpinner />
      ) : staff.length === 0 ? (
        <p className="text-sm text-slate-700">No moderators or admins yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Current moderators and admins</caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="py-2">Email</th>
              <th scope="col" className="py-2">Role</th>
              <th scope="col" className="py-2"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.email} className="border-b border-border">
                <td className="py-2">{s.email}</td>
                <td className="py-2 capitalize">{s.role}</td>
                <td className="py-2 text-right">
                  <button type="button" className={btnSecondary} onClick={() => save(s.email, "none")} aria-label={`Remove ${s.email}`}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
