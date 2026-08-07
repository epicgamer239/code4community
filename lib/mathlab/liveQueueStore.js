"use client";

import { collection, query, where } from "firebase/firestore";
import { firestore } from "@/firebase";
import { createSharedQueryListener } from "@/lib/firestore/sharedQueryListener";
import { firestoreToDate } from "@/lib/firestoreDates";
import { MathLabCache } from "@/utils/cache";

function mapPendingDocs(snap) {
  return snap.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: firestoreToDate(data.createdAt),
      acceptedAt: firestoreToDate(data.acceptedAt),
    };
  });
}

function mapAcceptedDocs(snap) {
  const sessions = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const sessionStartTime = data.sessionStartedAt?.toDate
      ? data.sessionStartedAt.toDate()
      : data.sessionStartedAt
        ? new Date(data.sessionStartedAt)
        : data.acceptedAt?.toDate
          ? data.acceptedAt.toDate()
          : new Date();

    sessions.push({
      id: docSnap.id,
      tutorId: data.tutorId,
      tutorName: data.tutorName || "Unknown Tutor",
      tutorEmail: data.tutorEmail || "",
      studentId: data.studentId,
      studentName: data.studentName || "Unknown Student",
      studentEmail: data.studentEmail || "",
      course: data.course || "Unknown",
      sessionStartedAt: sessionStartTime,
      acceptedAt: data.acceptedAt?.toDate
        ? data.acceptedAt.toDate()
        : data.acceptedAt
          ? new Date(data.acceptedAt)
          : new Date(),
      isStarted: !!data.sessionStartedAt,
    });
  });
  sessions.sort((a, b) => b.sessionStartedAt - a.sessionStartedAt);
  return sessions;
}

/** Shared Math Lab pending queue (status == pending). */
export const mathLabPendingListener = createSharedQueryListener({
  getQuery: () =>
    firestore
      ? query(collection(firestore, "tutoringRequests"), where("status", "==", "pending"))
      : null,
  mapSnapshot: (snap) => {
    const data = mapPendingDocs(snap);
    MathLabCache.setRequests(data);
    return data;
  },
});

/** Shared Math Lab active board (status == accepted). */
export const mathLabAcceptedListener = createSharedQueryListener({
  getQuery: () =>
    firestore
      ? query(collection(firestore, "tutoringRequests"), where("status", "==", "accepted"))
      : null,
  mapSnapshot: (snap) => {
    const data = mapAcceptedDocs(snap);
    MathLabCache.setActiveSessions(data);
    return data;
  },
});
