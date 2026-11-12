"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useRunEffect } from "@/hooks/useRunEffect";
import { useAuth } from "@/utils/AuthContext";
import { resolveDisplayName } from "@/lib/profile";
import { firestoreToDate, sortSessionsNewestFirst } from "@/lib/firestoreDates";
import { firestore } from "@/firebase";
import {
  updateDoc,
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { buildAsyncFormUrl } from "@/lib/writing-center/form";
import { SessionRequestList } from "./SessionRequestList";
import { SessionReportLink } from "./SessionReportLink";
import { SendReceiptToTeacherButton } from "./SendReceiptToTeacher";
import { getSessionReportUrl } from "@/lib/writing-center/sessionReport";
import {
  liveStudentWritingCenterSessionsQuery,
  fetchStudentWritingCenterHistory,
  mergeWritingCenterSessions,
  WC_LIVE_STATUSES,
} from "@/lib/writing-center/sessionQueries";
import { fetchReceiptSharesByStudent } from "@/lib/writing-center/receiptShares";
import { subscribeWhileVisible } from "@/lib/firestore/sharedQueryListener";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import { WritingCenterCache } from "@/utils/cache";
import { hydrateLiveList, mapSnapshotDocs } from "@/utils/liveFirestoreCache";
import { invalidateOnDataChange } from "@/utils/cacheInvalidation";
import { WritingCenterRequestChooser } from "./WritingCenterRequestChooser";
import { WritingCenterPassCard } from "./WritingCenterPassCard";
import { endWritingCenterPass } from "@/lib/writing-center/hallPass";
import { HALL_PASS_AUTO_CLOSE_MS } from "@/lib/writing-center/hallPassTiming";
import { useExpireStaleHallPasses } from "@/lib/writing-center/useExpireStaleHallPasses";
import {
  canSubmitLiveTutoringRequest,
  liveTutoringRequestBlockReason,
} from "@/lib/tutoringLiveWindow";

export default function StudentDashboard({ preview = false, asUser = null, mode = "home" }) {
  const [liveSessions, setLiveSessions] = useState([]);
  const [pastSessions, setPastSessions] = useState([]);
  const [receiptShares, setReceiptShares] = useState([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startingPass, setStartingPass] = useState(false);
  const [endingPass, setEndingPass] = useState(false);
  const [localPassStart, setLocalPassStart] = useState(null);
  const [localPassEnd, setLocalPassEnd] = useState(null);
  const [keptEndedPass, setKeptEndedPass] = useState(null);
  const closedPassIds = useRef(new Set());
  const openPassRef = useRef(null);
  const { user: authUser, userData } = useAuth();
  const asUserId = asUser?.uid || asUser?.id || null;
  const user = useMemo(() => {
    if (!asUserId) return authUser;
    return {
      uid: asUserId,
      displayName: asUser.displayName || null,
      email: asUser.email || "",
    };
  }, [asUserId, asUser?.displayName, asUser?.email, authUser]);

  const sessions = useMemo(
    () => mergeWritingCenterSessions(liveSessions, pastSessions),
    [liveSessions, pastSessions],
  );

  const sharesBySession = useMemo(() => {
    /** @type {Record<string, string[]>} */
    const map = {};
    for (const share of receiptShares) {
      if (!share.sessionId) continue;
      if (!map[share.sessionId]) map[share.sessionId] = [];
      map[share.sessionId].push(share.teacherId);
    }
    return map;
  }, [receiptShares]);

  const loadPastSessions = useCallback(async () => {
    if (!firestore || !user?.uid) return;
    try {
      const history = await fetchStudentWritingCenterHistory(firestore, user.uid);
      setPastSessions(history);
    } catch (err) {
    }
  }, [user]);

  const loadReceiptShares = useCallback(async () => {
    if (!firestore || !user?.uid) return;
    try {
      const shares = await fetchReceiptSharesByStudent(firestore, user.uid);
      setReceiptShares(shares);
    } catch (err) {
    }
  }, [user]);

  useRunEffect(() => {
    if (!user?.uid || !firestore) return;

    hydrateLiveList(() => WritingCenterCache.getSessionsForUser(user.uid), (cached) => {
      setLiveSessions(
        (cached || []).filter((s) => WC_LIVE_STATUSES.includes(s.status)),
      );
      setPastSessions(
        (cached || []).filter((s) => !WC_LIVE_STATUSES.includes(s.status)),
      );
    });

    loadPastSessions();
    loadReceiptShares();

    return subscribeWhileVisible(
      () => liveStudentWritingCenterSessionsQuery(firestore, user.uid),
      (snapshot) => {
        const data = mapSnapshotDocs(snapshot);
        const stillOpen = [];
        const endedPasses = [];
        for (const session of data) {
          if (session.sessionType === "IN_PERSON" && session.hallPassEndedAt) {
            endedPasses.push({ ...session, status: "COMPLETED" });
          } else {
            stillOpen.push(session);
          }
        }
        setLiveSessions(stillOpen);
        const watched = openPassRef.current;
        if (watched && !data.some((session) => session.id === watched.id)) {
          openPassRef.current = null;
          getDoc(doc(firestore, "sessions", watched.id))
            .then((snap) => {
              const row = snap.data();
              const arrived = firestoreToDate(row?.hallPassInAt) || firestoreToDate(row?.hallPassEndedAt);
              if (row?.status === "COMPLETED" && arrived) {
                setKeptEndedPass({
                  id: watched.id,
                  studentName: watched.studentName,
                  startedAt: watched.startedAt,
                  endedAt: arrived,
                });
              }
            })
            .catch(() => {});
        }
        if (endedPasses.length) {
          setPastSessions((prev) => mergeWritingCenterSessions(endedPasses, prev));
          for (const session of endedPasses) {
            if (closedPassIds.current.has(session.id)) continue;
            closedPassIds.current.add(session.id);
            updateDoc(doc(firestore, "sessions", session.id), {
              status: "COMPLETED",
              updatedAt: serverTimestamp(),
            }).catch(() => {
              closedPassIds.current.delete(session.id);
            });
          }
        }
      },
    );
  }, [user?.uid, loadPastSessions, loadReceiptShares]);

  useRunEffect(() => {
    if (!user?.uid || preview) return;
    WritingCenterCache.setSessionsForUser(user.uid, sessions);
  }, [sessions, user?.uid, preview]);

  useExpireStaleHallPasses(preview ? [] : liveSessions, (session) => {
    const started = firestoreToDate(session.hallPassStartedAt);
    if (!started) return;
    setKeptEndedPass({
      id: session.id,
      studentName: session.studentName,
      startedAt: started,
      endedAt: new Date(started.getTime() + HALL_PASS_AUTO_CLOSE_MS),
    });
    setLiveSessions((prev) => prev.filter((row) => row.id !== session.id));
  });

  const studentDisplayName =
    resolveDisplayName(userData, "") ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Student";

  const activePass = useMemo(() => {
    const live = liveSessions.filter(
      (session) =>
        session.sessionType === "IN_PERSON" &&
        WC_LIVE_STATUSES.includes(session.status) &&
        !session.hallPassEndedAt,
    );
    return sortSessionsNewestFirst(live)[0] || null;
  }, [liveSessions]);

  const passStartedAt = activePass
    ? firestoreToDate(activePass.hallPassStartedAt) ||
      (localPassStart?.id === activePass.id ? localPassStart.at : null)
    : null;
  const passEndedAt = activePass
    ? firestoreToDate(activePass.hallPassEndedAt) ||
      (localPassEnd?.id === activePass.id ? localPassEnd.at : null)
    : null;
  const passIsOpen = Boolean(activePass) && !passEndedAt;
  const passMarkedOut = Boolean(activePass && firestoreToDate(activePass.hallPassLeftAt));

  const handleEndPass = async () => {
    if (!activePass || endingPass || preview || !passStartedAt || passEndedAt) return;
    const ended = new Date();
    const pass = activePass;
    setEndingPass(true);
    setError("");
    try {
      assertClientRateLimit("sessionUpdate", user?.uid);
      closedPassIds.current.add(pass.id);
      setKeptEndedPass({
        id: pass.id,
        studentName: pass.studentName,
        startedAt: passStartedAt,
        endedAt: ended,
      });
      setLiveSessions((prev) => prev.filter((session) => session.id !== pass.id));
      setPastSessions((prev) =>
        mergeWritingCenterSessions([{ ...pass, status: "COMPLETED", hallPassEndedAt: ended }], prev),
      );
      await endWritingCenterPass(pass.id);
      await loadPastSessions();
    } catch (err) {
      closedPassIds.current.delete(pass.id);
      setKeptEndedPass(null);
      setLiveSessions((prev) => mergeWritingCenterSessions([pass], prev));
      setError(err.message || "Could not end the pass.");
    } finally {
      setEndingPass(false);
    }
  };

  useRunEffect(() => {
    if (!activePass || !passStartedAt || keptEndedPass) return;
    openPassRef.current = {
      id: activePass.id,
      studentName: activePass.studentName,
      startedAt: passStartedAt,
    };
  }, [activePass, passStartedAt, keptEndedPass]);

  const openAsyncForm = () => {
    const url = buildAsyncFormUrl({
      email: user?.email || "",
      name: studentDisplayName,
    });
    window.open(url, "_blank", "noopener,noreferrer");
    setError("");
  };

  const handleChoose = async (sessionType) => {
    if (isSubmitting || !user || preview) return;
    if (sessionType === "ASYNC") {
      openAsyncForm();
      return;
    }
    if (!canSubmitLiveTutoringRequest()) {
      setError(
        liveTutoringRequestBlockReason(new Date(), {
          serviceLabel: "In-person requests",
        }) || "In-person requests are closed right now.",
      );
      return;
    }
    if (passIsOpen) {
      setError("You already have an in-person pass.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      assertClientRateLimit("sessionCreate", user.uid);
      const created = await addDoc(collection(firestore, "sessions"), {
        studentId: user.uid,
        studentName: studentDisplayName,
        studentEmail: user.email || "",
        subject: "In-person tutoring",
        notes: "",
        sessionType: "IN_PERSON",
        status: "PENDING",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      void import("@/lib/tutorAlerts/notifyTutorsClient").then(({ requestTutorPushNotify }) =>
        requestTutorPushNotify({
          service: "writing-center",
          title: "New Writing Center request",
          body: `${studentDisplayName || "A student"} · In-person tutoring`,
          href: "/writing-center",
          tag: `wc-${created.id}`,
        }),
      );
      invalidateOnDataChange("writing_center_sessions", user.uid);
    } catch (err) {
      setError(err.message || "Failed to create pass");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (sessionId) => {
    try {
      assertClientRateLimit("sessionUpdate", user?.uid);
      await updateDoc(doc(firestore, "sessions", sessionId), {
        status: "CANCELLED",
        updatedAt: serverTimestamp(),
      });
      setPastSessions((prev) => {
        const cancelled = sessions.find((s) => s.id === sessionId);
        if (!cancelled) return prev;
        return mergeWritingCenterSessions(prev, [
          { ...cancelled, status: "CANCELLED" },
        ]);
      });
      invalidateOnDataChange("writing_center_sessions", user?.uid);
      await loadPastSessions();
    } catch (err) {
    }
  };

  const handleStartPass = async () => {
    if (!activePass || startingPass || preview || firestoreToDate(activePass.hallPassStartedAt)) return;
    const started = new Date();
    setLocalPassStart({ id: activePass.id, at: started });
    setStartingPass(true);
    setError("");
    try {
      assertClientRateLimit("sessionUpdate", user?.uid);
      await updateDoc(doc(firestore, "sessions", activePass.id), {
        hallPassStartedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      setLocalPassStart(null);
      setError(err.message || "Could not start the pass.");
    } finally {
      setStartingPass(false);
    }
  };

  const sessionList = (
    <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden w-full">
      <SessionRequestList
        sessions={sessions}
        emptyMessage="No sessions yet."
        showStudent={false}
        showActions
        renderActions={(session) => {
          if (session.status === "PENDING" && !preview) {
            return (
              <button
                type="button"
                onClick={() => handleCancel(session.id)}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Cancel
              </button>
            );
          }
          if (session.status === "COMPLETED" && getSessionReportUrl(session)) {
            return (
              <div className="flex flex-col items-end gap-1">
                <SessionReportLink session={session} />
                {!preview && (
                  <SendReceiptToTeacherButton
                    session={session}
                    alreadySentTeacherIds={sharesBySession[session.id] || []}
                    onSent={() => loadReceiptShares()}
                  />
                )}
              </div>
            );
          }
          return null;
        }}
      />
    </div>
  );

  if (mode === "history") {
    return (
      <div className={`w-full ${preview ? "" : "px-3 sm:px-4 lg:px-6 py-4"}`}>
        <header className="w-full mb-6 border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">Session History</h1>
          <p className="text-sm text-gray-600 mt-1">Your Writing Center requests.</p>
        </header>
        {sessionList}
      </div>
    );
  }

  const showingPass = Boolean(activePass || keptEndedPass);

  return (
    <div className={`flex w-full flex-col ${showingPass && !preview ? "min-h-0 flex-1" : ""} ${preview ? "" : "px-3 sm:px-4 lg:px-6 py-4"}`}>
      {!showingPass && (
      <header className="w-full mb-6 border-b border-gray-200 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Writing Center</h1>
          <p className="text-sm text-gray-600 mt-1">
            {activePass && (firestoreToDate(activePass.hallPassStartedAt) || localPassStart?.id === activePass.id)
              ? "Show this pass on the way to the Writing Center."
              : activePass
                ? "Press Start when you leave for the Writing Center."
                : "Choose in person for a pass, or async to open the Google Form."}
          </p>
        </div>
      </header>
      )}

      {showingPass && (
        <div className={preview ? "mb-6 flex justify-center" : "flex h-[calc(100dvh-10.5rem)] w-full items-center justify-center pb-14 md:h-[calc(100dvh-5.5rem)]"}>
          {keptEndedPass ? (
            <WritingCenterPassCard
              studentName={keptEndedPass.studentName || studentDisplayName}
              startedAt={keptEndedPass.startedAt}
              endedAt={keptEndedPass.endedAt}
            />
          ) : (
            <WritingCenterPassCard
              studentName={activePass.studentName || studentDisplayName}
              startedAt={passStartedAt}
              endedAt={passEndedAt}
              inRoom={Boolean(activePass.hallPassInAt) && !passMarkedOut}
              markedOut={passMarkedOut}
              onStart={preview ? undefined : handleStartPass}
              onStop={preview || !passStartedAt ? undefined : handleEndPass}
              stopping={endingPass}
              onCancel={preview ? undefined : () => handleCancel(activePass.id)}
              starting={startingPass}
            />
          )}
        </div>
      )}

      {!preview && !showingPass && (
        <div className="mb-6">
          <WritingCenterRequestChooser
            busy={isSubmitting}
            error={error}
            onSubmit={handleChoose}
          />
        </div>
      )}
    </div>
  );
}
