import { doc, getDoc, deleteDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import { isAdminEmail } from "@/lib/admin";
import { lookupBroadRunName } from "@/lib/club-hub/broadRunRoster";
import {
  applyPendingGrantToProfile,
  MATHLAB_TEAM_PENDING_COLLECTION,
  pendingTeamDocId,
} from "@/lib/mathlab/teamPending";
import { normalizeEmail } from "@/lib/email";
import { logClientError } from "@/lib/auth/logClientError";

/**
 * Load or create the Firestore user profile for a Firebase Auth user.
 * @param {import("firebase/auth").User} currentUser
 * @param {import("firebase/firestore").Firestore} firestore
 * @param {{ forceRefresh?: boolean, getCached?: () => object | null, setCached?: (data: object) => void }} [options]
 */
export async function bootstrapUserProfile(currentUser, firestore, options = {}) {
  if (!currentUser || !firestore) return null;

  try {
    const docRef = doc(firestore, "users", currentUser.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const normalizedEmail = normalizeEmail(data.email || currentUser.email);
      if (data.email && data.email !== normalizedEmail) {
        try {
          assertClientRateLimit("profileWrite", currentUser.uid);
          await updateDoc(docRef, { email: normalizedEmail, updatedAt: serverTimestamp() });
          data.email = normalizedEmail;
        } catch (migrateErr) {
          logClientError("bootstrapUserProfile.emailMigrate", migrateErr);
        }
      }
      return { ...data, email: normalizedEmail, uid: currentUser.uid };
    }

    const normalizedEmail = normalizeEmail(currentUser.email);
    const rosterName = lookupBroadRunName(normalizedEmail);
    const displayName =
      rosterName ||
      (currentUser.displayName && currentUser.displayName.trim()) ||
      (normalizedEmail && normalizedEmail.split("@")[0]) ||
      "User";
    let role = isAdminEmail(normalizedEmail) ? "admin" : "student";
    let mathLabRole = "";
    let writingCenterRole = "";
    const pendingRef = doc(
      firestore,
      MATHLAB_TEAM_PENDING_COLLECTION,
      pendingTeamDocId(normalizedEmail),
    );
    const pendingSnap = await getDoc(pendingRef);
    if (pendingSnap.exists()) {
      const withPending = applyPendingGrantToProfile(
        pendingSnap.data(),
        { role, mathLabRole, writingCenterRole },
        normalizedEmail,
      );
      role = withPending.role;
      mathLabRole = withPending.mathLabRole;
      writingCenterRole = withPending.writingCenterRole || "";
    }
    const newProfile = {
      email: normalizedEmail,
      displayName,
      photoURL: currentUser.photoURL || "",
      role,
      mathLabRole,
      writingCenterRole,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    assertClientRateLimit("profileWrite", currentUser.uid);
    await setDoc(docRef, newProfile);
    if (pendingSnap.exists()) {
      try {
        await deleteDoc(pendingRef);
      } catch (pendingErr) {
        logClientError("bootstrapUserProfile.pendingCleanup", pendingErr);
      }
    }
    const again = await getDoc(docRef);
    if (again.exists()) {
      return { ...again.data(), uid: currentUser.uid };
    }

    return null;
  } catch (error) {
    logClientError("bootstrapUserProfile", error);
    return null;
  }
}
