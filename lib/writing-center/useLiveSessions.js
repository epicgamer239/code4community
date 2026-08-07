"use client";

import { useEffect, useState } from "react";
import { firestore } from "@/firebase";
import { createSharedQueryListener } from "@/lib/firestore/sharedQueryListener";
import { liveWritingCenterSessionsQuery } from "@/lib/writing-center/sessionQueries";
import { mapSnapshotDocs } from "@/utils/liveFirestoreCache";
import { WritingCenterCache } from "@/utils/cache";

/** Shared live WC board: PENDING / ACCEPTED / IN_PROGRESS only. */
export const writingCenterLiveSessionsListener = createSharedQueryListener({
  getQuery: () =>
    firestore ? liveWritingCenterSessionsQuery(firestore) : null,
  mapSnapshot: (snap) => {
    const data = mapSnapshotDocs(snap);
    WritingCenterCache.setSessionsAll(data);
    return data;
  },
});

/**
 * Subscribe to the shared Writing Center live-session listener.
 * @param {boolean} [enabled=true]
 * @returns {Array<{ id: string } & Record<string, unknown>>}
 */
export function useWritingCenterLiveSessions(enabled = true) {
  const [liveSessions, setLiveSessions] = useState(
    () => /** @type {any[]} */ (writingCenterLiveSessionsListener.getLastData() || []),
  );

  useEffect(() => {
    if (!enabled || !firestore) return undefined;
    return writingCenterLiveSessionsListener.subscribe((data) => {
      setLiveSessions(Array.isArray(data) ? data : []);
    });
  }, [enabled]);

  return liveSessions;
}
