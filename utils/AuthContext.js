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
import { auth, firestore } from "@/firebase";
import { UserCache } from "@/utils/cache";
import { bootstrapUserProfile } from "@/lib/auth/bootstrapUserProfile";
import { syncClubHubSponsorAccess } from "@/lib/auth/syncClubHubSponsorAccess";
import { logClientError } from "@/lib/auth/logClientError";

const AuthContext = createContext({ user: null, userData: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(auth && firestore));

  const fetchUserData = useCallback(async (currentUser, forceRefresh = false) => {
    if (!currentUser || !firestore) {
      return null;
    }

    if (!forceRefresh) {
      const cachedData = UserCache.getUserData();
      if (cachedData && cachedData.uid === currentUser.uid) {
        return cachedData;
      }
    }

    const profile = await bootstrapUserProfile(currentUser, firestore);
    if (profile) {
      UserCache.setUserData(profile);
      void syncClubHubSponsorAccess(currentUser);
    }
    return profile;
  }, []);

  useEffect(() => {
    if (!auth || !firestore) {
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
        logClientError("AuthContext.onAuthStateChanged", error);
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
      loading: !auth || !firestore ? false : loading,
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
