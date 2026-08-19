"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";
import { firestore } from "@/firebase";
import {
  firestoreToDate,
  formatWritingCenterSessionDateTime,
} from "@/lib/firestoreDates";
import {
  WC_HISTORY_STATUSES,
  WC_HISTORY_FETCH_LIMIT,
  WC_LIVE_STATUSES,
} from "@/lib/writing-center/sessionQueries";
import {
  formatMiniLessonTutors,
  isMiniLessonSession,
} from "@/lib/writing-center/miniLesson";
import { WritingCenterCache } from "@/utils/cache";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import { invalidateOnDataChange } from "@/utils/cacheInvalidation";

function wcSessionTimestampMs(session) {
  const end = firestoreToDate(session.sessionEndTime);
  if (end) return end.getTime();
  const updated = firestoreToDate(session.updatedAt);
  if (updated) return updated.getTime();
  const created = firestoreToDate(session.createdAt);
  return created?.getTime() || 0;
}

function formatSessionType(session) {
  switch (session.sessionType) {
    case "MINI_LESSON":
      return "Mini lesson";
    case "ASYNC":
      return "Async";
    case "IN_PERSON":
      return "In-person";
    default:
      return session.sessionType || "Session";
  }
}

function sessionPrimaryLabel(session) {
  if (isMiniLessonSession(session)) {
    return session.subject || "Mini lesson";
  }
  return session.studentName || "Student";
}

function sessionTutorLabel(session) {
  if (isMiniLessonSession(session)) {
    return formatMiniLessonTutors(session);
  }
  return session.tutorName || "Unassigned";
}

export default function WritingCenterSuperModeSection({
  enabled,
  authUid,
  busyId,
  setBusyId,
  setError,
  setMessage,
}) {
  const [loading, setLoading] = useState(false);
  const [liveSessions, setLiveSessions] = useState([]);
  const [historySessions, setHistorySessions] = useState([]);

  const loadData = useCallback(async () => {
    if (!firestore || !enabled) return;
    setLoading(true);
    setError("");
    try {
      const [liveSnap, historySnap] = await Promise.all([
        getDocs(
          query(
            collection(firestore, "sessions"),
            where("status", "in", WC_LIVE_STATUSES),
          ),
        ),
        getDocs(
          query(
            collection(firestore, "sessions"),
            where("status", "in", WC_HISTORY_STATUSES),
            limit(WC_HISTORY_FETCH_LIMIT),
          ),
        ),
      ]);

      const live = liveSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => wcSessionTimestampMs(b) - wcSessionTimestampMs(a));

      const history = historySnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => wcSessionTimestampMs(b) - wcSessionTimestampMs(a))
        .slice(0, 100);

      setLiveSessions(live);
      setHistorySessions(history);
    } catch (err) {
      setError(err.message || "Failed to load Writing Center sessions.");
    } finally {
      setLoading(false);
    }
  }, [enabled, setError]);

  useEffect(() => {
    if (enabled) void loadData();
  }, [enabled, loadData]);

  const pendingCount = useMemo(
    () => liveSessions.filter((s) => s.status === "PENDING").length,
    [liveSessions],
  );
  const activeCount = useMemo(
    () =>
      liveSessions.filter(
        (s) => s.status === "ACCEPTED" || s.status === "IN_PROGRESS",
      ).length,
    [liveSessions],
  );

  const afterMutate = async (msg) => {
    WritingCenterCache.clearAll();
    invalidateOnDataChange("writing_center_sessions", "super_mode");
    setMessage(msg);
    await loadData();
  };

  const deleteSession = async (id) => {
    if (!window.confirm("Delete this Writing Center session?")) return;
    setBusyId(id);
    setError("");
    try {
      assertClientRateLimit("profileWrite", authUid);
      await deleteDoc(doc(firestore, "sessions", id));
      await afterMutate("Deleted Writing Center session.");
    } catch (err) {
      setError(err.message || "Delete failed.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteLiveByStatuses = async (statuses, label) => {
    const targets = liveSessions.filter((s) => statuses.includes(s.status));
    if (targets.length === 0) {
      setMessage(`No ${label} to delete.`);
      return;
    }
    if (!window.confirm(`Delete all ${targets.length} ${label}?`)) return;
    setBusyId(`wc-bulk-${statuses.join("-")}`);
    setError("");
    try {
      assertClientRateLimit("profileWrite", authUid);
      await Promise.all(
        targets.map((s) => deleteDoc(doc(firestore, "sessions", s.id))),
      );
      await afterMutate(`Deleted ${targets.length} ${label}.`);
    } catch (err) {
      setError(err.message || "Bulk delete failed.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteHistoryOlderThanDays = async (days) => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const targets = historySessions.filter((s) => {
      const t = wcSessionTimestampMs(s);
      return t > 0 && t < cutoff;
    });
    if (targets.length === 0) {
      setMessage(`No history sessions older than ${days} days (in loaded list).`);
      return;
    }
    if (
      !window.confirm(
        `Delete ${targets.length} completed/cancelled session(s) older than ${days} days?`,
      )
    ) {
      return;
    }
    setBusyId(`wc-bulk-old-${days}`);
    setError("");
    try {
      assertClientRateLimit("profileWrite", authUid);
      await Promise.all(
        targets.map((s) => deleteDoc(doc(firestore, "sessions", s.id))),
      );
      await afterMutate(`Deleted ${targets.length} old Writing Center sessions.`);
    } catch (err) {
      setError(err.message || "Bulk delete failed.");
    } finally {
      setBusyId(null);
    }
  };

  const clearCacheOnly = () => {
    WritingCenterCache.clearAll();
    setMessage("Cleared Writing Center client cache.");
  };

  if (!enabled) return null;

  return (
    <div className="space-y-4 pt-2 border-t border-border">
      <div>
        <h3 className="text-base font-semibold text-foreground">Writing Center</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Live requests, active sessions, mini lessons, and completed/cancelled history.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading || Boolean(busyId)}
          onClick={() => void loadData()}
          className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted disabled:opacity-50"
        >
          {loading ? "Refreshing WC…" : "Refresh WC"}
        </button>
        <button
          type="button"
          disabled={Boolean(busyId) || pendingCount === 0}
          onClick={() => void deleteLiveByStatuses(["PENDING"], "pending requests")}
          className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted disabled:opacity-50"
        >
          Delete all pending ({pendingCount})
        </button>
        <button
          type="button"
          disabled={Boolean(busyId) || activeCount === 0}
          onClick={() =>
            void deleteLiveByStatuses(
              ["ACCEPTED", "IN_PROGRESS"],
              "active sessions",
            )
          }
          className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted disabled:opacity-50"
        >
          Delete all active ({activeCount})
        </button>
        <button
          type="button"
          disabled={Boolean(busyId)}
          onClick={() => void deleteHistoryOlderThanDays(7)}
          className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted disabled:opacity-50"
        >
          Delete history &gt; 7 days
        </button>
        <button
          type="button"
          disabled={Boolean(busyId)}
          onClick={() => void deleteHistoryOlderThanDays(30)}
          className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted disabled:opacity-50"
        >
          Delete history &gt; 30 days
        </button>
        <button
          type="button"
          onClick={clearCacheOnly}
          className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted"
        >
          Clear WC cache
        </button>
      </div>

      <section className="card-elevated rounded-xl overflow-hidden">
        <div className="px-6 pt-5 pb-3">
          <h4 className="text-sm font-semibold text-foreground">Live sessions</h4>
          <p className="text-sm text-muted-foreground">
            Pending, accepted, and in-progress ({liveSessions.length})
          </p>
        </div>
        {loading && liveSessions.length === 0 ? (
          <p className="px-6 pb-5 text-sm text-muted-foreground">Loading…</p>
        ) : liveSessions.length === 0 ? (
          <p className="px-6 pb-5 text-sm text-muted-foreground">Nothing live right now.</p>
        ) : (
          <ul className="divide-y divide-border max-h-72 overflow-y-auto">
            {liveSessions.map((session) => (
              <li key={session.id} className="px-6 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {sessionPrimaryLabel(session)}
                    {sessionTutorLabel(session) !== "Not assigned" &&
                    sessionTutorLabel(session) !== "Unassigned"
                      ? ` → ${sessionTutorLabel(session)}`
                      : ""}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {formatSessionType(session)} · {session.status}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {formatWritingCenterSessionDateTime(session)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={Boolean(busyId)}
                  onClick={() => void deleteSession(session.id)}
                  className="shrink-0 text-sm font-medium text-destructive hover:underline disabled:opacity-40"
                >
                  {busyId === session.id ? "Deleting…" : "Delete"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card-elevated rounded-xl overflow-hidden">
        <div className="px-6 pt-5 pb-3">
          <h4 className="text-sm font-semibold text-foreground">History</h4>
          <p className="text-sm text-muted-foreground">
            Completed, cancelled, and mini lessons — most recent {historySessions.length}{" "}
            (max 100 loaded)
          </p>
        </div>
        {loading && historySessions.length === 0 ? (
          <p className="px-6 pb-5 text-sm text-muted-foreground">Loading…</p>
        ) : historySessions.length === 0 ? (
          <p className="px-6 pb-5 text-sm text-muted-foreground">No history sessions.</p>
        ) : (
          <ul className="divide-y divide-border max-h-[28rem] overflow-y-auto">
            {historySessions.map((session) => (
              <li key={session.id} className="px-6 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {sessionPrimaryLabel(session)}
                    {sessionTutorLabel(session) !== "Not assigned" &&
                    sessionTutorLabel(session) !== "Unassigned"
                      ? ` → ${sessionTutorLabel(session)}`
                      : ""}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {formatSessionType(session)} · {session.status} ·{" "}
                    {formatWritingCenterSessionDateTime(session)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={Boolean(busyId)}
                  onClick={() => void deleteSession(session.id)}
                  className="shrink-0 text-sm font-medium text-destructive hover:underline disabled:opacity-40"
                >
                  {busyId === session.id ? "Deleting…" : "Delete"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
