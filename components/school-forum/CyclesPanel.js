"use client";

import { useCallback, useId, useState } from "react";
import { useRunEffect } from "@/hooks/useRunEffect";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import {
  LiveMessage,
  Notice,
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
  DEFAULT_CYCLE_DAYS,
} from "@/lib/school-forum/constants";
import { forumFetch } from "@/lib/school-forum/forumClient";

const PHASE_LABELS = {
  scheduled: "Scheduled",
  open: "Voting open",
  ended: "Closing",
  closed: "Closed",
};

/** yyyy-MM-ddTHH:mm in local time, for datetime-local inputs. */
function toLocalInput(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function CreateCycleForm({ user, onCreated }) {
  const id = useId();
  const [label, setLabel] = useState("");
  const [startsAt, setStartsAt] = useState(() => toLocalInput(new Date()));
  const [endsAt, setEndsAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const defaultEnd = (() => {
    const d = new Date(startsAt);
    if (Number.isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + DEFAULT_CYCLE_DAYS);
    return d;
  })();

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await forumFetch(user, "/cycles", {
        method: "POST",
        body: {
          action: "create",
          label,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        },
      });
      setLabel("");
      setEndsAt("");
      onCreated(label || "New cycle");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className={`${cardClass} space-y-3`} aria-labelledby={`${id}-heading`}>
      <h3 id={`${id}-heading`} className="text-lg font-bold text-foreground">Start a voting cycle</h3>
      <Notice kind="error" focus>{error}</Notice>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor={`${id}-label`} className={labelClass}>Name (optional)</label>
          <input id={`${id}-label`} value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. November, part 1" className={`${inputClass} mt-1`} />
        </div>
        <div>
          <label htmlFor={`${id}-start`} className={labelClass}>Starts</label>
          <input id={`${id}-start`} type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={`${inputClass} mt-1`} />
        </div>
        <div>
          <label htmlFor={`${id}-end`} className={labelClass}>Ends</label>
          <input id={`${id}-end`} type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} aria-describedby={`${id}-end-hint`} className={`${inputClass} mt-1`} />
          <p id={`${id}-end-hint`} className="mt-1 text-xs text-slate-700">
            Leave blank for {DEFAULT_CYCLE_DAYS} days{defaultEnd ? ` (${formatDate(defaultEnd.toISOString(), { withTime: true })})` : ""}.
          </p>
        </div>
      </div>
      <button type="submit" disabled={busy} className={btnPrimary}>{busy ? "Creating…" : "Create cycle"}</button>
    </form>
  );
}

function ResultsTable({ cycle, canFlag, onFlag, busyKey }) {
  const rows = cycle.phase === "closed" ? cycle.summary : cycle.ranked;
  if (!rows.length) {
    return <p className="mt-3 text-sm text-slate-700">No concerns were open for voting in this cycle.</p>;
  }
  const flagged = new Set(cycle.flaggedConcernIds);
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <caption className="sr-only">
          {cycle.phase === "closed" ? `Presentation list for ${cycle.label}` : `Live ranking for ${cycle.label}`}
        </caption>
        <thead>
          <tr className="border-b border-border text-slate-700">
            <th scope="col" className="py-2 pr-3">Rank</th>
            <th scope="col" className="py-2 pr-3">Concern</th>
            <th scope="col" className="py-2 pr-3">Category</th>
            <th scope="col" className="py-2 pr-3">Votes</th>
            {canFlag ? <th scope="col" className="py-2">Include in presentation</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.concernId} className="border-b border-border">
              <td className="py-2 pr-3 font-semibold">{r.rank}</td>
              <td className="py-2 pr-3">
                {r.title}
                {r.addedByFlag ? <span className="ml-2 text-xs font-semibold text-blue-800">(added by SCA)</span> : null}
              </td>
              <td className="py-2 pr-3">{CONCERN_CATEGORY_LABELS[r.category] ?? r.category}</td>
              <td className="py-2 pr-3">{r.votes}</td>
              {canFlag ? (
                <td className="py-2">
                  <input
                    type="checkbox"
                    checked={flagged.has(r.concernId)}
                    disabled={busyKey === `${cycle.id}:${r.concernId}`}
                    onChange={(e) => onFlag(cycle, r, e.target.checked)}
                    aria-label={`Include "${r.title}" in the presentation even if it has few votes`}
                    className="h-4 w-4 accent-blue-700"
                  />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Cycle list with results. Moderators can flag low-vote concerns for the presentation;
 * admins can also create and close cycles.
 */
export default function CyclesPanel({ user, canManage }) {
  const [cycles, setCycles] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyKey, setBusyKey] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await forumFetch(user, "/cycles");
      setCycles(data.cycles);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [user]);

  useRunEffect(() => {
    void load();
  }, [load]);

  const onFlag = async (cycle, row, flagged) => {
    setBusyKey(`${cycle.id}:${row.concernId}`);
    try {
      await forumFetch(user, "/cycles", { method: "POST", body: { action: "flag", cycleId: cycle.id, concernId: row.concernId, flagged } });
      setMessage(flagged ? `"${row.title}" will be included in the presentation.` : `"${row.title}" is no longer flagged.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey("");
    }
  };

  const onClose = async (cycle) => {
    const verb = cycle.phase === "scheduled" ? "Cancel" : "Close";
    if (!window.confirm(`${verb} "${cycle.label}" now? ${cycle.phase === "scheduled" ? "It hasn't started yet." : "Voting will lock and results will be final."}`)) return;
    setBusyKey(`close:${cycle.id}`);
    try {
      await forumFetch(user, "/cycles", { method: "POST", body: { action: "close", cycleId: cycle.id } });
      setMessage(`"${cycle.label}" ${cycle.phase === "scheduled" ? "was cancelled" : "is closed. Results are ready"}.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey("");
    }
  };

  if (!cycles && !error) return <LoadingSpinner text="Loading cycles" />;

  return (
    <section aria-labelledby="cycles-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="cycles-heading" className="text-2xl font-bold text-foreground">Voting cycles &amp; results</h2>
        <button type="button" onClick={() => window.print()} className={`${btnSecondary} print:hidden`}>Print results</button>
      </div>
      <LiveMessage message={message} />
      <Notice kind="error" focus>{error}</Notice>
      {canManage ? (
        <div className="print:hidden">
          <CreateCycleForm user={user} onCreated={(label) => { setMessage(`Cycle "${label}" created.`); void load(); }} />
        </div>
      ) : null}
      {cycles?.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-400 bg-slate-50 p-8 text-center text-slate-700">No cycles yet.</div>
      ) : (
        <ul className="space-y-4">
          {(cycles ?? []).map((cycle) => (
            <li key={cycle.id}>
              <article aria-labelledby={`cycle-${cycle.id}`} className={cardClass}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 id={`cycle-${cycle.id}`} className="text-lg font-bold text-foreground">{cycle.label}</h3>
                    <p className="text-sm text-slate-700">
                      {PHASE_LABELS[cycle.phase] ?? cycle.phase} · {formatDate(cycle.startsAt, { withTime: true })} to{" "}
                      {formatDate(cycle.closedAt ?? cycle.endsAt, { withTime: true })}
                      {cycle.uniqueVoters != null ? ` · ${cycle.uniqueVoters} students voted` : ""}
                    </p>
                  </div>
                  {canManage && (cycle.phase === "open" || cycle.phase === "scheduled") ? (
                    <button type="button" disabled={busyKey === `close:${cycle.id}`} onClick={() => onClose(cycle)} className={`${btnDanger} print:hidden`}>
                      {cycle.phase === "scheduled" ? "Cancel cycle" : "Close voting now"}
                    </button>
                  ) : null}
                </div>
                {cycle.phase === "open" || cycle.phase === "closed" ? (
                  <>
                    <h4 className="mt-3 text-sm font-semibold text-foreground">
                      {cycle.phase === "closed" ? "Presentation list (top concerns + flagged)" : "Live ranking"}
                    </h4>
                    <ResultsTable cycle={cycle} canFlag onFlag={onFlag} busyKey={busyKey} />
                  </>
                ) : null}
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
