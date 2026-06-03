"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import { auth, firestore } from "@/firebase";
import { UserCache } from "@/utils/cache";
import { isAdminEmail } from "@/config/admin";
import { lookupBroadRunName } from "@/lib/broadRunRoster";
import {
  applyPendingGrantToProfile,
  MATHLAB_TEAM_PENDING_COLLECTION,
  pendingTeamDocId,
} from "@/lib/mathlabTeamPending";
import { normalizeEmail } from "@/lib/email";

const AuthContext = createContext({ user: null, userData: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(auth));
  const fetchUserData = useCallback(async (currentUser, forceRefresh = false) => {
    if (!currentUser || !firestore) {
      return null;
    }

    try {
      if (!forceRefresh) {
        const cachedData = UserCache.getUserData();
        if (cachedData && cachedData.uid === currentUser.uid) {
          return cachedData;
        }
      }

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
          }
        }
        const userDataWithUid = { ...data, email: normalizedEmail, uid: currentUser.uid };
        UserCache.setUserData(userDataWithUid);
        return userDataWithUid;
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
      const pendingRef = doc(
        firestore,
        MATHLAB_TEAM_PENDING_COLLECTION,
        pendingTeamDocId(normalizedEmail),
      );
      const pendingSnap = await getDoc(pendingRef);
      if (pendingSnap.exists()) {
        const withPending = applyPendingGrantToProfile(
          pendingSnap.data(),
          { role, mathLabRole },
          normalizedEmail,
        );
        role = withPending.role;
        mathLabRole = withPending.mathLabRole;
      }
      const newProfile = {
        email: normalizedEmail,
        displayName,
        photoURL: currentUser.photoURL || "",
        role,
        mathLabRole,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      assertClientRateLimit("profileWrite", currentUser.uid);
      await setDoc(docRef, newProfile);
      if (pendingSnap.exists()) {
        try {
          await deleteDoc(pendingRef);
        } catch (pendingErr) {
        }
      }
      const again = await getDoc(docRef);
      if (again.exists()) {
        const userDataWithUid = { ...again.data(), uid: currentUser.uid };
        UserCache.setUserData(userDataWithUid);
        return userDataWithUid;
      }

      return null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!auth || !firestore) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        setUser(currentUser);

        if (currentUser) {
          const freshData = await fetchUserData(currentUser, true);
          if (freshData) {
            setUserData(freshData);
          } else {
            const cachedData = UserCache.getUserData();
            if (cachedData && cachedData.uid === currentUser.uid) {
              setUserData(cachedData);
            }
          }
        } else {
          setUserData(null);
          UserCache.clearUserData();
        }
      } catch (error) {
        const cachedData = UserCache.getUserData();
        if (cachedData) {
          setUserData(cachedData);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchUserData]);

  useEffect(() => {
    const handleRoleChange = async (event) => {
      if (user && event.detail.userId === user.uid) {
        const freshData = await fetchUserData(user, true);
        if (freshData) {
          setUserData(freshData);
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("userRoleChanged", handleRoleChange);
      return () => {
        window.removeEventListener("userRoleChanged", handleRoleChange);
      };
    }
    return undefined;
  }, [user, fetchUserData]);

  const getRedirectUrl = () => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const redirectTo = urlParams.get("redirectTo");
      if (redirectTo && redirectTo.startsWith("/")) {
        return redirectTo;
      }
    }
    return null;
  };

  const contextValue = useMemo(
    () => ({
      user,
      userData,
      loading,
      getRedirectUrl,
      isEmailVerified: true,
    }),
    [user, userData, loading],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
