"use client";

import { useEffect, useRef } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { firestore } from "@/firebase";
import { tutorCanTakeCourse } from "@/lib/mathlab/courses";
import { isExpiredScheduledPending } from "@/lib/mathlab/scheduledRequests";
import {
  isAcceptingTutoring,
  TUTOR_ALERT_MATHLAB,
  TUTOR_ALERT_WRITING_CENTER,
} from "@/lib/tutorAlerts/services";
import { playTutorAlertSound } from "@/lib/tutorAlerts/sound";
import { showTutorBrowserNotification } from "@/lib/tutorAlerts/browserNotify";

/**
 * @param {object} opts
 * @param {boolean} opts.active
 * @param {string} opts.serviceKey
 * @param {() => import("firebase/firestore").Query | null} opts.getQuery
 * @param {(snap: import("firebase/firestore").QuerySnapshot) => string[]} opts.mapIds
 * @param {(id: string, snap: import("firebase/firestore").QuerySnapshot) => { title: string, body: string, href: string } | null} opts.buildAlert
 */
function useAlwaysOnIncomingAlerts({ active, serviceKey, getQuery, mapIds, buildAlert }) {
  const seenRef = useRef(/** @type {Set<string> | null} */ (null));
  const readyRef = useRef(false);
  const mapIdsRef = useRef(mapIds);
  const buildAlertRef = useRef(buildAlert);
  const getQueryRef = useRef(getQuery);

  useEffect(() => {
    mapIdsRef.current = mapIds;
    buildAlertRef.current = buildAlert;
    getQueryRef.current = getQuery;
  }, [mapIds, buildAlert, getQuery]);

  useEffect(() => {
    if (!active || !firestore) {
      seenRef.current = null;
      readyRef.current = false;
      return undefined;
    }

    let q;
    try {
      q = getQueryRef.current();
    } catch {
      return undefined;
    }
    if (!q) return undefined;

    const unsub = onSnapshot(
      q,
      (snap) => {
        const ids = mapIdsRef.current(snap);
        if (!readyRef.current) {
          seenRef.current = new Set(ids);
          readyRef.current = true;
          return;
        }
        const prev = seenRef.current || new Set();
        const newcomers = ids.filter((id) => !prev.has(id));
        seenRef.current = new Set(ids);
        for (const id of newcomers) {
          const alert = buildAlertRef.current(id, snap);
          if (!alert) continue;
          playTutorAlertSound();
          void showTutorBrowserNotification({
            title: alert.title,
            body: alert.body,
            tag: `${serviceKey}-${id}`,
            href: alert.href,
          });
        }
      },
      () => {
        /* permission / network — keep quiet */
      },
    );

    return () => {
      unsub();
      readyRef.current = false;
      seenRef.current = null;
    };
  }, [active, serviceKey]);
}

/**
 * @param {{
 *   enabled: boolean,
 *   userData: Record<string, unknown> | null | undefined,
 *   displayUser?: Record<string, unknown> | null,
 * }} opts
 */
export function useMathLabIncomingAlerts({ enabled, userData, displayUser }) {
  const tutor = displayUser || userData;
  const active = Boolean(enabled && isAcceptingTutoring(TUTOR_ALERT_MATHLAB, userData));
  const tutorRef = useRef(tutor);

  useEffect(() => {
    tutorRef.current = tutor;
  }, [tutor]);

  useAlwaysOnIncomingAlerts({
    active,
    serviceKey: TUTOR_ALERT_MATHLAB,
    getQuery: () =>
      firestore
        ? query(collection(firestore, "tutoringRequests"), where("status", "==", "pending"))
        : null,
    mapIds: (snap) =>
      snap.docs
        .map((d) => {
          const data = d.data();
          if (!tutorCanTakeCourse(tutorRef.current, data.course)) return null;
          if (isExpiredScheduledPending({ id: d.id, ...data })) return null;
          return d.id;
        })
        .filter(Boolean),
    buildAlert: (id, snap) => {
      const row = snap.docs.find((d) => d.id === id);
      const data = row?.data() || {};
      return {
        title: "New Math Lab request",
        body: `${data.studentName || "A student"} needs help with ${data.course || "a course"}`,
        href: "/mathlab",
      };
    },
  });
}

/**
 * @param {{
 *   enabled: boolean,
 *   userData: Record<string, unknown> | null | undefined,
 * }} opts
 */
export function useWritingCenterIncomingAlerts({ enabled, userData }) {
  const active = Boolean(
    enabled && isAcceptingTutoring(TUTOR_ALERT_WRITING_CENTER, userData),
  );

  useAlwaysOnIncomingAlerts({
    active,
    serviceKey: TUTOR_ALERT_WRITING_CENTER,
    getQuery: () =>
      firestore
        ? query(
            collection(firestore, "sessions"),
            where("status", "in", ["PENDING", "ACCEPTED", "IN_PROGRESS"]),
          )
        : null,
    mapIds: (snap) =>
      snap.docs.filter((d) => d.data()?.status === "PENDING").map((d) => d.id),
    buildAlert: (id, snap) => {
      const row = snap.docs.find((d) => d.id === id);
      const data = row?.data() || {};
      const name = data.studentName || data.studentEmail || "A student";
      const subject =
        data.subject || data.assignmentType || data.course || "writing help";
      return {
        title: "New Writing Center request",
        body: `${name} · ${subject}`,
        href: "/writing-center",
      };
    },
  });
}
