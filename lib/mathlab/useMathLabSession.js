"use client";

import { useCallback, useRef, useState } from "react";
import { useRunEffect } from "@/hooks/useRunEffect";
import { useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { firestore } from "@/firebase";
import { firestoreToDate } from "@/lib/firestoreDates";
import { tutorCanTakeCourse } from "@/lib/mathlab/courses";
import { mathlabLoginPath } from "@/lib/mathlab/guest";
import {
  REQUEST_TYPE_NOW,
  REQUEST_TYPE_SCHEDULED,
  canStartScheduledSession,
  formatScheduleLabel,
  isExpiredScheduledPending,
  isScheduledRequest,
  normalizeScheduledTime,
  toLocalYmd,
} from "@/lib/mathlab/scheduledRequests";
import { subscribeWhileVisible } from "@/lib/firestore/sharedQueryListener";
import { runEffectWork } from "@/hooks/runEffectWork";
import { resolveDisplayName } from "@/lib/profile";
import { MathLabCache, UserCache } from "@/utils/cache";
import { invalidateOnDataChange } from "@/utils/cacheInvalidation";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import { isTutorOrHigher } from "@/utils/authorization";

/**
 * Student request, tutor active session, timers, and session actions.
 */
export function useMathLabSession({
  user,
  userData,
  displayUser,
  isTutor,
  pendingRequests,
  setPendingRequests,
  activeSessions,
}) {
  const router = useRouter();

  const [selectedCourse, setSelectedCourse] = useState("");
  const [requestMode, setRequestMode] = useState(REQUEST_TYPE_NOW);
  const [scheduledTime, setScheduledTime] = useState("16:20");
  const [scheduledDate, setScheduledDate] = useState(() => toLocalYmd());
  const [isMatching, setIsMatching] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [studentRequest, setStudentRequest] = useState(null);
  const [previousStudentRequest, setPreviousStudentRequest] = useState(null);
  const [sessionStatus, setSessionStatus] = useState(null);
  const [sessionEndData, setSessionEndData] = useState(null);
  const [acceptingRequestId, setAcceptingRequestId] = useState(null);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [roleChangeMessage, setRoleChangeMessage] = useState("");
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const studentRequestRef = useRef(studentRequest);
  const previousStudentRequestRef = useRef(previousStudentRequest);
  const sessionDurationRef = useRef(sessionDuration);
  const endingSessionRef = useRef(false);

  useRunEffect(() => {
    studentRequestRef.current = studentRequest;
  }, [studentRequest]);

  useRunEffect(() => {
    previousStudentRequestRef.current = previousStudentRequest;
  }, [previousStudentRequest]);

  useRunEffect(() => {
    sessionDurationRef.current = sessionDuration;
  }, [sessionDuration]);

  useRunEffect(() => {
    if (!displayUser) return undefined;
    return runEffectWork(() => setShowRoleSelection(!displayUser.mathLabRole));
  }, [displayUser]);

  // Restore tutor active session on mount
  useRunEffect(() => {
    if (!isTutor || !displayUser?.uid) return undefined;

    const checkActiveSessions = async () => {
      try {
        const q = query(
          collection(firestore, "tutoringRequests"),
          where("tutorId", "==", displayUser.uid),
          where("status", "==", "accepted"),
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        const acceptedList = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        const accepted =
          acceptedList.find((a) => a.sessionStartedAt) ||
          acceptedList.find((a) => !isScheduledRequest(a)) ||
          null;
        if (!accepted) return;

        setActiveSession({
          requestId: accepted.id,
          studentId: accepted.studentId,
          studentName: accepted.studentName,
          studentEmail: accepted.studentEmail,
          course: accepted.course,
          requestType: accepted.requestType || REQUEST_TYPE_NOW,
          scheduledTime: accepted.scheduledTime || null,
          scheduledDate: accepted.scheduledDate || null,
          startTime: accepted.acceptedAt?.toDate
            ? accepted.acceptedAt.toDate()
            : new Date(),
        });

        if (accepted.sessionStartedAt) {
          const sessionStartedAt = firestoreToDate(accepted.sessionStartedAt);
          setSessionStartTime(sessionStartedAt);
          setSessionStatus("started");
          const now = new Date();
          setSessionDuration(Math.floor((now - sessionStartedAt) / 1000));
        } else {
          setSessionStartTime(
            accepted.acceptedAt?.toDate
              ? accepted.acceptedAt.toDate()
              : new Date(),
          );
          setSessionStatus("accepted");
        }
      } catch {
        /* ignore */
      }
    };

    checkActiveSessions();
  }, [isTutor, displayUser?.uid]);

  // Session timer
  useRunEffect(() => {
    const isSessionActive =
      (activeSession && sessionStartTime) ||
      (studentRequest && sessionStatus === "started" && sessionStartTime);

    if (!isSessionActive) return undefined;

    const interval = setInterval(() => {
      const now = new Date();
      setSessionDuration(Math.floor((now - sessionStartTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession, sessionStartTime, studentRequest, sessionStatus]);

  // Student request listener
  useRunEffect(() => {
    const studentUid = displayUser?.uid;
    if (!studentUid) {
      setStudentRequest(null);
      return undefined;
    }

    const applyStudentMatch = (match) => {
      if (match.status === "pending") {
        setStudentRequest({
          id: match.id,
          course: match.course,
          status: match.status,
          createdAt: firestoreToDate(match.createdAt) || new Date(),
          requestType: match.requestType || REQUEST_TYPE_NOW,
          scheduledTime: match.scheduledTime || null,
          scheduledDate: match.scheduledDate || null,
        });
        setPreviousStudentRequest(null);
      } else if (match.status === "accepted") {
        const sessionStartedAt = firestoreToDate(match.sessionStartedAt);
        setStudentRequest({
          id: match.id,
          course: match.course,
          status: match.status,
          createdAt: firestoreToDate(match.createdAt),
          tutorName: match.tutorName,
          acceptedAt: firestoreToDate(match.acceptedAt) || new Date(),
          sessionStartedAt,
          requestType: match.requestType || REQUEST_TYPE_NOW,
          scheduledTime: match.scheduledTime || null,
          scheduledDate: match.scheduledDate || null,
        });
        setPreviousStudentRequest(null);

        if (sessionStartedAt) {
          setSessionStatus("started");
          setSessionStartTime(sessionStartedAt);
          const now = new Date();
          setSessionDuration(Math.floor((now - sessionStartedAt) / 1000));
        } else {
          setSessionStatus("accepted");
        }
      }
    };

    const handleEmptySnapshot = () => {
      const requestToCheck =
        studentRequestRef.current || previousStudentRequestRef.current;
      if (requestToCheck && requestToCheck.status === "accepted") {
        setSessionEndData({
          studentName: resolveDisplayName(displayUser, "Student"),
          studentEmail: displayUser?.email || "",
          tutorName: requestToCheck.tutorName || "Tutor",
          tutorEmail: requestToCheck.tutorEmail || "",
          course: requestToCheck.course,
          startTime:
            requestToCheck.sessionStartedAt || requestToCheck.acceptedAt,
          endTime: new Date(),
          duration: sessionDurationRef.current || 0,
        });
        setSessionStatus("ended");
      }

      if (studentRequestRef.current) {
        setPreviousStudentRequest(studentRequestRef.current);
      }
      setStudentRequest(null);
    };

    const checkStudentRequest = async () => {
      try {
        const q = query(
          collection(firestore, "tutoringRequests"),
          where("studentId", "==", displayUser.uid),
          where("status", "in", ["pending", "accepted"]),
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          const match = docs.find(
            (d) => d.status === "pending" || d.status === "accepted",
          );
          if (match) applyStudentMatch(match);
        } else {
          handleEmptySnapshot();
        }
      } catch {
        /* ignore */
      }
    };

    checkStudentRequest();

    let pollInterval = null;
    const unsubscribe = subscribeWhileVisible(
      () =>
        query(
          collection(firestore, "tutoringRequests"),
          where("studentId", "==", displayUser.uid),
          where("status", "in", ["pending", "accepted"]),
        ),
      (snapshot) => {
        if (!snapshot.empty) {
          const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          const match = docs.find(
            (d) => d.status === "pending" || d.status === "accepted",
          );
          if (match) applyStudentMatch(match);
        } else {
          handleEmptySnapshot();
        }
      },
      () => {
        if (!pollInterval) pollInterval = setInterval(checkStudentRequest, 2000);
      },
    );

    return () => {
      unsubscribe();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [displayUser]);

  const cleanupOldRequests = useCallback(async () => {
    if (!displayUser || !["teacher", "admin"].includes(displayUser.role)) {
      return;
    }

    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const pendingRequestsQuery = query(
        collection(firestore, "tutoringRequests"),
        where("status", "==", "pending"),
      );
      const snapshot = await getDocs(pendingRequestsQuery);
      const batch = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const createdAt = firestoreToDate(data.createdAt) || new Date(0);
        const expiredScheduled = isExpiredScheduledPending({
          ...data,
          status: "pending",
        });

        if (
          expiredScheduled ||
          (!isScheduledRequest(data) && createdAt < oneDayAgo)
        ) {
          batch.push(deleteDoc(docSnap.ref));
        }
      });

      if (batch.length > 0) {
        await Promise.all(batch);
        MathLabCache.clearAll();
      }
    } catch {
      /* ignore */
    }
  }, [displayUser]);

  useRunEffect(() => {
    cleanupOldRequests();
    const cleanupInterval = setInterval(cleanupOldRequests, 30 * 60 * 1000);
    return () => clearInterval(cleanupInterval);
  }, [cleanupOldRequests]);

  const handleMatchMe = async () => {
    if (!selectedCourse) {
      alert("Please select a course first!");
      return;
    }
    if (!user) {
      router.push(mathlabLoginPath("/mathlab"));
      return;
    }

    const isScheduled = requestMode === REQUEST_TYPE_SCHEDULED;
    if (isScheduled) {
      if (!normalizeScheduledTime(scheduledTime)) {
        alert("Please choose a valid start time.");
        return;
      }
      if (!scheduledDate || scheduledDate < toLocalYmd()) {
        alert("Please choose today or a future date.");
        return;
      }
    }

    setIsMatching(true);

    try {
      assertClientRateLimit("tutoringRequestCreate", displayUser?.uid);
      const requestData = {
        studentId: displayUser?.uid,
        studentName: resolveDisplayName(
          displayUser,
          user?.email || "Anonymous Student",
        ),
        studentEmail: displayUser?.email || "",
        course: selectedCourse,
        description: isScheduled
          ? `Scheduled help with ${selectedCourse} (${formatScheduleLabel({
              requestType: REQUEST_TYPE_SCHEDULED,
              scheduledTime,
              scheduledDate,
            })})`
          : `Help needed with ${selectedCourse}`,
        status: "pending",
        requestType: isScheduled ? REQUEST_TYPE_SCHEDULED : REQUEST_TYPE_NOW,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (isScheduled) {
        requestData.scheduledTime = scheduledTime;
        requestData.scheduledDate = scheduledDate;
      }

      const docRef = await addDoc(
        collection(firestore, "tutoringRequests"),
        requestData,
      );

      setStudentRequest({
        id: docRef.id,
        course: selectedCourse,
        status: "pending",
        createdAt: new Date(),
        requestType: requestData.requestType,
        scheduledTime: isScheduled ? scheduledTime : null,
        scheduledDate: isScheduled ? scheduledDate : null,
      });

      setIsMatching(false);
      setSelectedCourse("");
      setRequestMode(REQUEST_TYPE_NOW);
    } catch (error) {
      alert(error.message || "Failed to submit request. Please try again.");
      setIsMatching(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!studentRequest) return;

    try {
      assertClientRateLimit("tutoringRequestUpdate", displayUser?.uid);
      await deleteDoc(doc(firestore, "tutoringRequests", studentRequest.id));
      MathLabCache.clearAll();
      invalidateOnDataChange("tutoring_request", "cancelled");
      setStudentRequest(null);
    } catch {
      alert("Failed to cancel request. Please try again.");
    }
  };

  const handleEndSession = async () => {
    if (!activeSession || endingSessionRef.current) return;
    endingSessionRef.current = true;
    setIsEndingSession(true);

    const session = activeSession;
    const requestId = session.requestId;
    const startedAt = sessionStartTime;

    try {
      assertClientRateLimit("tutoringRequestUpdate", displayUser?.uid);
      const endTime = new Date();
      const elapsed = startedAt
        ? Math.floor((endTime - startedAt) / 1000)
        : 0;
      const durationSecs = Math.max(1, sessionDurationRef.current || elapsed);

      const completedRef = doc(firestore, "completedSessions", requestId);
      const existing = await getDoc(completedRef);

      if (!existing.exists()) {
        await setDoc(completedRef, {
          studentId: session.studentId,
          studentName: session.studentName,
          studentEmail: session.studentEmail || "",
          tutorId: displayUser?.uid,
          tutorName: resolveDisplayName(
            displayUser,
            user?.email || "Anonymous Tutor",
          ),
          tutorEmail: displayUser?.email || "",
          course: session.course,
          requestId,
          startTime: startedAt || endTime,
          endTime,
          duration: durationSecs,
          completedAt: endTime,
          status: "completed",
        });
      }

      try {
        await deleteDoc(doc(firestore, "tutoringRequests", requestId));
      } catch {
        /* request may already be gone */
      }

      MathLabCache.clearAll();
      invalidateOnDataChange("tutoring_session", "ended");
      MathLabCache.setSessions([]);

      setSessionEndData({
        studentName: session.studentName,
        studentEmail: session.studentEmail,
        tutorName: resolveDisplayName(
          displayUser,
          user?.email || "Anonymous Tutor",
        ),
        tutorEmail: displayUser?.email || "",
        course: session.course,
        startTime: startedAt,
        endTime,
        duration: durationSecs,
      });
      setSessionStatus("ended");
      setActiveSession(null);
      setSessionStartTime(null);
      setSessionDuration(0);
    } catch (error) {
      if (error?.code === "permission-denied" && requestId) {
        try {
          await deleteDoc(doc(firestore, "tutoringRequests", requestId));
        } catch {
          /* ignore */
        }
        MathLabCache.clearAll();
        MathLabCache.setSessions([]);
        setSessionStatus("ended");
        setActiveSession(null);
        setSessionStartTime(null);
        setSessionDuration(0);
      } else {
        alert("Failed to end session. Please try again.");
      }
    } finally {
      endingSessionRef.current = false;
      setIsEndingSession(false);
    }
  };

  const handleAcceptRequest = async (requestId, studentId, course) => {
    if (!isTutorOrHigher(userData.role, userData.mathLabRole)) {
      alert("You don't have permission to accept requests.");
      return;
    }
    if (acceptingRequestId) return;

    try {
      assertClientRateLimit("tutoringRequestUpdate", displayUser?.uid);

      const request = pendingRequests.find((req) => req.id === requestId);
      if (!request) {
        alert("That request is no longer available.");
        return;
      }

      if (!tutorCanTakeCourse(displayUser, request.course || course)) {
        alert("You are not assigned to tutor this course.");
        return;
      }

      if (activeSession) {
        alert("Finish your current session before accepting another request.");
        return;
      }

      const upcomingScheduled = activeSessions.filter(
        (s) =>
          s.tutorId === displayUser?.uid &&
          isScheduledRequest(s) &&
          !s.isStarted,
      );
      if (isScheduledRequest(request) && upcomingScheduled.length > 0) {
        alert(
          "You already have an upcoming scheduled session. Start or finish it first.",
        );
        return;
      }

      setAcceptingRequestId(requestId);

      const tutorName = resolveDisplayName(
        displayUser,
        user?.email || "Anonymous Tutor",
      );
      const tutorEmail = displayUser?.email || "";
      const tutorUid = displayUser?.uid;

      await runTransaction(firestore, async (tx) => {
        const requestRef = doc(firestore, "tutoringRequests", requestId);
        const snap = await tx.get(requestRef);
        if (!snap.exists()) throw new Error("GONE");
        const data = snap.data();
        if (data.status !== "pending") throw new Error("TAKEN");
        tx.update(requestRef, {
          status: "accepted",
          tutorId: tutorUid,
          tutorName,
          tutorEmail,
          acceptedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));

      if (isScheduledRequest(request)) {
        setSessionStatus("");
      } else {
        setActiveSession({
          requestId,
          studentId: request.studentId,
          studentName: request.studentName,
          studentEmail: request.studentEmail,
          course: request.course,
          requestType: REQUEST_TYPE_NOW,
        });
        setSessionStatus("accepted");
      }
    } catch (error) {
      if (error?.message === "TAKEN" || error?.code === "permission-denied") {
        alert("Another tutor already accepted this request.");
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      } else if (error?.message === "GONE") {
        alert("That request was cancelled or removed.");
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      } else {
        alert("Failed to accept request. Please try again.");
      }
    } finally {
      setAcceptingRequestId(null);
    }
  };

  const handleStartSession = async () => {
    if (!activeSession) return;

    try {
      assertClientRateLimit("tutoringRequestUpdate", displayUser?.uid);
      const startTime = new Date();
      setSessionStartTime(startTime);
      setSessionDuration(0);
      setSessionStatus("started");

      await updateDoc(doc(firestore, "tutoringRequests", activeSession.requestId), {
        sessionStartedAt: startTime,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to start session:", error);
      const detail =
        error?.code === "permission-denied"
          ? " Missing or insufficient permissions."
          : error?.message
            ? ` ${error.message}`
            : "";
      alert(`Failed to start session.${detail}`);
      setSessionStatus("accepted");
      setSessionStartTime(null);
    }
  };

  const handleOpenUpcomingScheduled = (session) => {
    if (activeSession) {
      alert("Finish your current session first.");
      return;
    }
    if (!canStartScheduledSession(session)) {
      alert(
        "You can start this session beginning 15 minutes before the scheduled time.",
      );
      return;
    }
    setActiveSession({
      requestId: session.id,
      studentId: session.studentId,
      studentName: session.studentName,
      studentEmail: session.studentEmail,
      course: session.course,
      requestType: session.requestType || REQUEST_TYPE_SCHEDULED,
      scheduledTime: session.scheduledTime || null,
      scheduledDate: session.scheduledDate || null,
    });
    setSessionStatus("accepted");
  };

  const handleDismissSession = () => {
    setSessionEndData(null);
    setSessionStatus(null);
  };

  const handleRoleSelection = useCallback(async () => {
    const selectedRole = "student";
    setIsUpdating(true);

    try {
      const userId = displayUser?.uid;
      if (!userId) {
        throw new Error("User ID not found. Please try refreshing the page.");
      }

      const currentRole = displayUser?.mathLabRole;
      const isSwitchingToStudent =
        currentRole === "tutor" && selectedRole === "student";

      if (isSwitchingToStudent) {
        setActiveSession(null);
        setSessionStartTime(null);
        setSessionDuration(0);
        setPendingRequests([]);
        setRoleChangeMessage(
          "Switched to student role. Any active tutor sessions have been cleared.",
        );
        setTimeout(() => setRoleChangeMessage(""), 5000);
      }

      assertClientRateLimit("profileWrite", userId);
      await updateDoc(doc(firestore, "users", userId), {
        mathLabRole: selectedRole,
        updatedAt: new Date(),
      });

      const updatedUser = { ...displayUser, mathLabRole: selectedRole };
      UserCache.setUserData(updatedUser);
      invalidateOnDataChange("mathlab_role", "update");

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("userRoleChanged", {
            detail: { newRole: selectedRole, userId },
          }),
        );
      }

      setShowRoleSelection(false);
    } catch (error) {
      alert(error.message || "Failed to update role. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  }, [displayUser, setPendingRequests]);

  useRunEffect(() => {
    if (showRoleSelection && displayUser) {
      handleRoleSelection();
    }
  }, [showRoleSelection, displayUser, handleRoleSelection]);

  return {
    selectedCourse,
    setSelectedCourse,
    requestMode,
    setRequestMode,
    scheduledTime,
    setScheduledTime,
    scheduledDate,
    setScheduledDate,
    isMatching,
    activeSession,
    sessionStartTime,
    sessionDuration,
    studentRequest,
    sessionStatus,
    sessionEndData,
    acceptingRequestId,
    isEndingSession,
    roleChangeMessage,
    handleMatchMe,
    handleCancelRequest,
    handleEndSession,
    handleAcceptRequest,
    handleStartSession,
    handleOpenUpcomingScheduled,
    handleDismissSession,
  };
}
