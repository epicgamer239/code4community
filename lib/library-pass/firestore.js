import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { firestore } from "@/firebase";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import { resolveDisplayName } from "@/lib/profile";
import { subscribeWhileVisible } from "@/lib/firestore/sharedQueryListener";
import {
  LIBRARY_PASS_SETTINGS_ID,
  LIBRARY_PASS_BLOCKS,
  normalizeSettings,
  passDocId,
  toYmd,
  isLibraryPassDay,
  resolveDayType,
  parseYmd,
  studentCanUseLibraryBlock,
} from "@/lib/library-pass/libraryPass";

const SETTINGS_PATH = ["libraryPassSettings", LIBRARY_PASS_SETTINGS_ID];
const PASSES = "libraryPasses";

export function subscribeLibraryPassSettings(onData, onError) {
  if (!firestore) return () => {};
  const ref = doc(firestore, ...SETTINGS_PATH);
  return onSnapshot(
    ref,
    (snap) => onData(normalizeSettings(snap.exists() ? snap.data() : null)),
    onError,
  );
}

export function subscribePassesForDate(date, onData, onError) {
  if (!firestore) return () => {};
  return subscribeWhileVisible(
    () =>
      query(
        collection(firestore, PASSES),
        where("date", "==", date),
        where("status", "==", "active"),
      ),
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(rows);
    },
    onError,
  );
}

export async function ensureDefaultSettings() {
  if (!firestore) return;
  const ref = doc(firestore, ...SETTINGS_PATH);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(ref, {
    passesEnabled: true,
    blockCapacities: normalizeSettings(null).blockCapacities,
    dayTypeOverride: null,
    updatedAt: serverTimestamp(),
  });
}

export async function updateLibraryPassSettings(patch) {
  if (!firestore) throw new Error("Firebase is not configured.");
  const { adminUid, ...data } = patch;
  assertClientRateLimit("libraryPassAdmin", adminUid);
  const ref = doc(firestore, ...SETTINGS_PATH);
  await setDoc(
    ref,
    { ...data, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function claimLibraryPass({ user, userData, date, blockId }) {
  if (!firestore || !user) throw new Error("Sign in to get a pass.");
  assertClientRateLimit("libraryPassClaim", user.uid);

  const settingsRef = doc(firestore, ...SETTINGS_PATH);
  const settingsSnap = await getDoc(settingsRef);
  const settings = normalizeSettings(settingsSnap.exists() ? settingsSnap.data() : null);

  if (!settings.passesEnabled) {
    throw new Error("Library passes are stopped for today.");
  }

  if (!isLibraryPassDay(date) && !settings.dayTypeOverride) {
    throw new Error("Library passes are not available on this date.");
  }

  const dayType = resolveDayType(parseYmd(date), settings);
  if (!dayType) {
    throw new Error("Library passes are not available on this date.");
  }

  const blockMeta = LIBRARY_PASS_BLOCKS.find((b) => b.id === Number(blockId));
  if (!blockMeta || blockMeta.dayType !== dayType) {
    throw new Error("This block is not open today.");
  }

  // Re-check against the live user doc so stale client profile cannot bypass assignment.
  const profileSnap = await getDoc(doc(firestore, "users", user.uid));
  const profileData = profileSnap.exists() ? profileSnap.data() : userData;
  if (!studentCanUseLibraryBlock(profileData, blockId)) {
    throw new Error(
      "You can only get a library pass during your assigned study hall block.",
    );
  }

  const capacity = settings.blockCapacities[String(blockId)] ?? 0;
  if (capacity <= 0) {
    throw new Error("This block is not accepting passes.");
  }

  const passId = passDocId(date, user.uid);
  const passRef = doc(firestore, PASSES, passId);
  const existing = await getDoc(passRef);
  if (existing.exists() && existing.data()?.status === "active") {
    const heldBlock = existing.data().blockId;
    if (Number(heldBlock) === Number(blockId)) {
      throw new Error("You already have a pass for this block.");
    }
    throw new Error(
      `You already have a pass for Block ${heldBlock}. Cancel it first to switch blocks.`,
    );
  }

  const q = query(
    collection(firestore, PASSES),
    where("date", "==", date),
    where("blockId", "==", blockId),
    where("status", "==", "active"),
  );
  const activeSnap = await getDocs(q);
  if (activeSnap.size >= capacity) {
    throw new Error("This block is full.");
  }

  await setDoc(passRef, {
    date,
    blockId: Number(blockId),
    studentId: user.uid,
    studentName: resolveDisplayName(userData || user, user.email || "Student"),
    studentEmail: user.email || "",
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function cancelLibraryPass({ passId, uid, isAdmin = false }) {
  if (!firestore) throw new Error("Firebase is not configured.");
  assertClientRateLimit(isAdmin ? "libraryPassAdmin" : "libraryPassClaim", uid);
  const passRef = doc(firestore, PASSES, passId);
  const snap = await getDoc(passRef);
  if (!snap.exists()) throw new Error("Pass not found.");
  const data = snap.data();
  if (!isAdmin && data.studentId !== uid) {
    throw new Error("You can only cancel your own pass.");
  }
  await deleteDoc(passRef);
}

export async function cancelAllPassesForDate(date, adminUid) {
  if (!firestore) throw new Error("Firebase is not configured.");
  assertClientRateLimit("libraryPassAdmin", adminUid);
  const q = query(
    collection(firestore, PASSES),
    where("date", "==", date),
    where("status", "==", "active"),
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

export { toYmd };
