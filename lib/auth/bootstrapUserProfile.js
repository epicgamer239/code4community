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
import { fetchSignupEmailAllowlist } from "@/lib/auth/signupAllowlist";
import { isSignupEmailAllowed } from "@/lib/auth/signupEmailPolicy";
import { applyLegacyProductAdminMigration } from "@/lib/auth/productAdmins";
import {
  applyWritingCenterPendingGrantToProfile,
  pendingWritingCenterTeamDocId,
  WRITING_CENTER_TEAM_PENDING_COLLECTION,
} from "@/lib/writing-center/teamPending";

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
      const merged = applyLegacyProductAdminMigration({
        ...data,
        email: normalizedEmail,
      });
      return { ...merged, uid: currentUser.uid };
    }

    const normalizedEmail = normalizeEmail(currentUser.email);
    const allowlist = await fetchSignupEmailAllowlist();
    if (!isSignupEmailAllowed(normalizedEmail, allowlist)) {
      throw new Error("This email is not allowed to create an account.");
    }
    const rosterName = lookupBroadRunName(normalizedEmail);
    const displayName =
      rosterName ||
      (currentUser.displayName && currentUser.displayName.trim()) ||
      (normalizedEmail && normalizedEmail.split("@")[0]) ||
      "User";
    let role = isAdminEmail(normalizedEmail) ? "admin" : "student";
    let mathLabRole = "";
    let writingCenterRole = "";
    let mathLabAdmin = false;
    let writingCenterAdmin = false;
    const pendingRef = doc(
      firestore,
      MATHLAB_TEAM_PENDING_COLLECTION,
      pendingTeamDocId(normalizedEmail),
    );
    const pendingSnap = await getDoc(pendingRef);
    if (pendingSnap.exists()) {
      const withPending = applyPendingGrantToProfile(
        pendingSnap.data(),
        { role, mathLabRole, writingCenterRole, mathLabAdmin },
        normalizedEmail,
      );
      role = withPending.role;
      mathLabRole = withPending.mathLabRole;
      writingCenterRole = withPending.writingCenterRole || "";
      mathLabAdmin = withPending.mathLabAdmin === true;
    }
    const wcPendingRef = doc(
      firestore,
      WRITING_CENTER_TEAM_PENDING_COLLECTION,
      pendingWritingCenterTeamDocId(normalizedEmail),
    );
    const wcPendingSnap = await getDoc(wcPendingRef);
    if (wcPendingSnap.exists()) {
      const withWc = applyWritingCenterPendingGrantToProfile(wcPendingSnap.data(), {
        writingCenterAdmin,
      });
      writingCenterAdmin = withWc.writingCenterAdmin === true;
    }
    const newProfile = {
      email: normalizedEmail,
      displayName,
      photoURL: currentUser.photoURL || "",
      role,
      mathLabRole,
      writingCenterRole,
      ...(mathLabAdmin ? { mathLabAdmin: true } : {}),
      ...(writingCenterAdmin ? { writingCenterAdmin: true } : {}),
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
    if (wcPendingSnap.exists()) {
      try {
        await deleteDoc(wcPendingRef);
      } catch (pendingErr) {
        logClientError("bootstrapUserProfile.wcPendingCleanup", pendingErr);
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
