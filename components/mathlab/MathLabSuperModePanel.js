"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { firestore } from "@/firebase";
import { firestoreToDate, formatRequestDateTime } from "@/lib/firestoreDates";
import { formatScheduleLabel, isScheduledRequest } from "@/lib/mathlab/scheduledRequests";
import { MathLabCache } from "@/utils/cache";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import {
  isMathLabSuperModeEnabled,
  setMathLabSuperModeEnabled,
  subscribeMathLabSuperMode,
} from "@/lib/mathlab/superMode";
import WritingCenterSuperModeSection from "@/components/writing-center/WritingCenterSuperModeSection";

function formatCompletedWhen(value) {
  const d = firestoreToDate(value);
  if (!d) return "Unknown";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MathLabSuperModePanel({ authUid }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [liveRequests, setLiveRequests] = useState([]);
  const [completed, setCompleted] = useState([]);

  useEffect(() => {
    setEnabled(isMathLabSuperModeEnabled());
    return subscribeMathLabSuperMode(setEnabled);
  }, []);

  const loadData = useCallback(async () => {
    if (!firestore || !enabled) return;
    setLoading(true);
    setError("");
    try {
      const [pendingSnap, acceptedSnap, completedSnap] = await Promise.all([
        getDocs(query(collection(firestore, "tutoringRequests"), where("status", "==", "pending"))),
        getDocs(query(collection(firestore, "tutoringRequests"), where("status", "==", "accepted"))),
        getDocs(query(collection(firestore, "completedSessions"), orderBy("completedAt", "desc"))),
      ]);

      const live = [
        ...pendingSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        ...acceptedSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      ].sort((a, b) => {
        const aT = firestoreToDate(a.updatedAt || a.createdAt)?.getTime() || 0;
        const bT = firestoreToDate(b.updatedAt || b.createdAt)?.getTime() || 0;
        return bT - aT;
      });

      setLiveRequests(live);
      setCompleted(
        completedSnap.docs.map((d) => ({ id: d.id, ...d.data() })).slice(0, 100),
      );
    } catch (err) {
      setError(err.message || "Failed to load Math Lab data.");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) void loadData();
  }, [enabled, loadData]);

  const pendingCount = useMemo(
    () => liveRequests.filter((r) => r.status === "pending").length,
    [liveRequests],
  );
  const acceptedCount = useMemo(
    () => liveRequests.filter((r) => r.status === "accepted").length,
    [liveRequests],
  );

  const toggleEnabled = () => {
    if (enabled) {
      setMathLabSuperModeEnabled(false);
      setEnabled(false);
      setMessage("Super mode off.");
      return;
    }
    const ok = window.confirm(
      "Turn on Super mode? You can delete Math Lab and Writing Center live requests, active sessions, and history. This cannot be undone.",
    );
    if (!ok) return;
    setMathLabSuperModeEnabled(true);
    setEnabled(true);
    setMessage("Super mode on.");
  };

  const afterMutate = async (msg) => {
    MathLabCache.clearAll();
    setMessage(msg);
    await loadData();
  };

  const deleteLive = async (id) => {
    if (!window.confirm("Delete this live request/session?")) return;
    setBusyId(id);
    setError("");
    try {
      assertClientRateLimit("profileWrite", authUid);
      await deleteDoc(doc(firestore, "tutoringRequests", id));
      await afterMutate("Deleted live request.");
    } catch (err) {
      setError(err.message || "Delete failed.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteCompleted = async (id) => {
    if (!window.confirm("Delete this completed session from history?")) return;
    setBusyId(id);
    setError("");
    try {
      assertClientRateLimit("profileWrite", authUid);
      await deleteDoc(doc(firestore, "completedSessions", id));
      await afterMutate("Deleted completed session.");
    } catch (err) {
      setError(err.message || "Delete failed.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteLiveByStatus = async (status) => {
    const targets = liveRequests.filter((r) => r.status === status);
    if (targets.length === 0) {
      setMessage(`No ${status} requests to delete.`);
      return;
    }
    const label = status === "pending" ? "pending requests" : "active/accepted sessions";
    if (!window.confirm(`Delete all ${targets.length} ${label}?`)) return;
    setBusyId(`bulk-${status}`);
    setError("");
    try {
      assertClientRateLimit("profileWrite", authUid);
      await Promise.all(targets.map((r) => deleteDoc(doc(firestore, "tutoringRequests", r.id))));
      await afterMutate(`Deleted ${targets.length} ${label}.`);
    } catch (err) {
      setError(err.message || "Bulk delete failed.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteCompletedOlderThanDays = async (days) => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const targets = completed.filter((s) => {
      const t = firestoreToDate(s.completedAt)?.getTime() || 0;
      return t > 0 && t < cutoff;
    });
    if (targets.length === 0) {
      setMessage(`No completed sessions older than ${days} days (in loaded list).`);
      return;
    }
    if (!window.confirm(`Delete ${targets.length} completed session(s) older than ${days} days?`)) {
      return;
    }
    setBusyId(`bulk-old-${days}`);
    setError("");
    try {
      assertClientRateLimit("profileWrite", authUid);
      await Promise.all(targets.map((s) => deleteDoc(doc(firestore, "completedSessions", s.id))));
      await afterMutate(`Deleted ${targets.length} old completed sessions.`);
    } catch (err) {
      setError(err.message || "Bulk delete failed.");
    } finally {
      setBusyId(null);
    }
  };

  const clearCacheOnly = () => {
    MathLabCache.clearAll();
    setMessage("Cleared Math Lab client cache.");
  };

  return (
    <div className="space-y-6">
      <div className="card-elevated p-6 rounded-xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Super mode</h2>
            <p className="text-sm text-muted-foreground">
              Destructive cleanup for Math Lab and Writing Center — stuck live requests,
              active sessions, and completed history. Stays on for this browser tab until
              you turn it off.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleEnabled}
            className={`shrink-0 px-5 py-2.5 font-medium rounded-lg ${
              enabled
                ? "bg-destructive text-white hover:opacity-90"
                : "bg-foreground text-background hover:opacity-90"
            }`}
          >
            {enabled ? "Turn off" : "Enable Super mode"}
          </button>
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="text-sm text-green-700 dark:text-green-400" role="status">
            {message}
          </p>
        )}
      </div>

      {!enabled ? (
        <p className="text-sm text-muted-foreground px-1">
          Enable Super mode to load and delete Math Lab and Writing Center session data.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading || Boolean(busyId)}
              onClick={() => void loadData()}
              className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted disabled:opacity-50"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button
              type="button"
              disabled={Boolean(busyId) || pendingCount === 0}
              onClick={() => void deleteLiveByStatus("pending")}
              className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted disabled:opacity-50"
            >
              Delete all pending ({pendingCount})
            </button>
            <button
              type="button"
              disabled={Boolean(busyId) || acceptedCount === 0}
              onClick={() => void deleteLiveByStatus("accepted")}
              className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted disabled:opacity-50"
            >
              Delete all active ({acceptedCount})
            </button>
            <button
              type="button"
              disabled={Boolean(busyId)}
              onClick={() => void deleteCompletedOlderThanDays(7)}
              className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted disabled:opacity-50"
            >
              Delete completed &gt; 7 days
            </button>
            <button
              type="button"
              disabled={Boolean(busyId)}
              onClick={() => void deleteCompletedOlderThanDays(30)}
              className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted disabled:opacity-50"
            >
              Delete completed &gt; 30 days
            </button>
            <button
              type="button"
              onClick={clearCacheOnly}
              className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted"
            >
              Clear client cache
            </button>
          </div>

          <section className="card-elevated rounded-xl overflow-hidden">
            <div className="px-6 pt-5 pb-3">
              <h3 className="text-base font-semibold text-foreground">Math Lab — live queue & sessions</h3>
              <p className="text-sm text-muted-foreground">
                Pending requests and accepted/in-progress sessions ({liveRequests.length})
              </p>
            </div>
            {loading && liveRequests.length === 0 ? (
              <p className="px-6 pb-5 text-sm text-muted-foreground">Loading…</p>
            ) : liveRequests.length === 0 ? (
              <p className="px-6 pb-5 text-sm text-muted-foreground">Nothing live right now.</p>
            ) : (
              <ul className="divide-y divide-border">
                {liveRequests.map((req) => (
                  <li key={req.id} className="px-6 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {req.studentName || "Student"}
                        {req.tutorName ? ` → ${req.tutorName}` : ""}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {req.course} · {req.status}
                        {req.sessionStartedAt ? " · started" : ""}
                        {isScheduledRequest(req) ? ` · ${formatScheduleLabel(req)}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatRequestDateTime(firestoreToDate(req.createdAt))}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(busyId)}
                      onClick={() => void deleteLive(req.id)}
                      className="shrink-0 text-sm font-medium text-destructive hover:underline disabled:opacity-40"
                    >
                      {busyId === req.id ? "Deleting…" : "Delete"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card-elevated rounded-xl overflow-hidden">
            <div className="px-6 pt-5 pb-3">
              <h3 className="text-base font-semibold text-foreground">Math Lab — completed sessions</h3>
              <p className="text-sm text-muted-foreground">
                Most recent {completed.length} (max 100 loaded)
              </p>
            </div>
            {loading && completed.length === 0 ? (
              <p className="px-6 pb-5 text-sm text-muted-foreground">Loading…</p>
            ) : completed.length === 0 ? (
              <p className="px-6 pb-5 text-sm text-muted-foreground">No completed sessions.</p>
            ) : (
              <ul className="divide-y divide-border max-h-[28rem] overflow-y-auto">
                {completed.map((session) => (
                  <li key={session.id} className="px-6 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {session.tutorName || "Tutor"} · {session.studentName || "Student"}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {session.course} · {formatCompletedWhen(session.completedAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(busyId)}
                      onClick={() => void deleteCompleted(session.id)}
                      className="shrink-0 text-sm font-medium text-destructive hover:underline disabled:opacity-40"
                    >
                      {busyId === session.id ? "Deleting…" : "Delete"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <WritingCenterSuperModeSection
            enabled={enabled}
            authUid={authUid}
            busyId={busyId}
            setBusyId={setBusyId}
            setError={setError}
            setMessage={setMessage}
          />
        </>
      )}
    </div>
  );
}
