"use client";

import { useMemo, useState } from "react";
import { useRunEffect } from "@/hooks/useRunEffect";
import { tutorCanTakeCourse } from "@/lib/mathlab/courses";
import {
  compareScheduledRequests,
  isExpiredScheduledPending,
  isScheduledRequest,
} from "@/lib/mathlab/scheduledRequests";
import {
  mathLabAcceptedListener,
  mathLabPendingListener,
} from "@/lib/mathlab/liveQueueStore";
import { MathLabCache } from "@/utils/cache";

/**
 * Subscribe to shared Math Lab pending + accepted queue listeners.
 * @param {boolean} isTutor
 * @param {object | null | undefined} displayUser
 */
export function useMathLabQueue(isTutor, displayUser) {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);
  const [isLoadingActiveSessions, setIsLoadingActiveSessions] = useState(false);

  useRunEffect(() => {
    if (!isTutor) return undefined;

    const filterForTutor = (requests) => {
      const list = Array.isArray(requests) ? requests : [];
      return list.filter(
        (req) =>
          tutorCanTakeCourse(displayUser, req.course) &&
          !isExpiredScheduledPending(req),
      );
    };

    const cachedRequests = MathLabCache.getRequests();
    if (cachedRequests && cachedRequests.length >= 0) {
      setPendingRequests(filterForTutor(cachedRequests));
      setIsLoadingRequests(false);
    } else {
      setIsLoadingRequests(true);
    }

    return mathLabPendingListener.subscribe((requests) => {
      setPendingRequests(filterForTutor(requests));
      setIsLoadingRequests(false);
    });
  }, [isTutor, displayUser]);

  useRunEffect(() => {
    if (!isTutor) return undefined;

    setIsLoadingActiveSessions(true);
    const cachedActiveSessions = MathLabCache.getActiveSessions();
    if (cachedActiveSessions && cachedActiveSessions.length >= 0) {
      setActiveSessions(cachedActiveSessions);
      setIsLoadingActiveSessions(false);
    }

    return mathLabAcceptedListener.subscribe((sessions) => {
      setActiveSessions(Array.isArray(sessions) ? sessions : []);
      setIsLoadingActiveSessions(false);
    });
  }, [isTutor]);

  const livePendingRequests = useMemo(
    () => pendingRequests.filter((r) => !isScheduledRequest(r)),
    [pendingRequests],
  );

  const scheduledPendingRequests = useMemo(
    () =>
      pendingRequests
        .filter((r) => isScheduledRequest(r))
        .sort(compareScheduledRequests),
    [pendingRequests],
  );

  const myUpcomingScheduled = useMemo(
    () =>
      activeSessions.filter(
        (s) =>
          s.tutorId === displayUser?.uid &&
          isScheduledRequest(s) &&
          !s.isStarted,
      ),
    [activeSessions, displayUser?.uid],
  );

  return {
    pendingRequests,
    setPendingRequests,
    livePendingRequests,
    scheduledPendingRequests,
    myUpcomingScheduled,
    activeSessions,
    isLoadingRequests,
    isLoadingActiveSessions,
  };
}
