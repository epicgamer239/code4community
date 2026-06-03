/**
 * Helpers for live Firestore UIs: show cached data immediately, keep onSnapshot as source of truth.
 */

/**
 * @param {() => unknown[] | null | undefined} getCached
 * @param {(data: unknown[]) => void} setState
 * @returns {boolean} whether cache hydrated state
 */
export function hydrateLiveList(getCached, setState) {
  const cached = getCached();
  if (Array.isArray(cached)) {
    setState(cached);
    return true;
  }
  return false;
}

/**
 * @param {import('firebase/firestore').QuerySnapshot} snapshot
 * @returns {Array<{ id: string } & Record<string, unknown>>}
 */
export function mapSnapshotDocs(snapshot) {
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * @param {import('firebase/firestore').QuerySnapshot} snapshot
 * @param {(data: ReturnType<typeof mapSnapshotDocs>) => void} setState
 * @param {(data: ReturnType<typeof mapSnapshotDocs>) => void} setCached
 */
export function commitLiveSnapshot(snapshot, setState, setCached) {
  const data = mapSnapshotDocs(snapshot);
  setState(data);
  setCached(data);
  return data;
}
