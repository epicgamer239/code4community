"use client";

import { useMemo } from "react";
import { UserCache } from "@/utils/cache";

/** Auth user + Firestore profile, with UserCache fallback while profile loads. */
export function useMathLabDisplayUser(user, userData) {
  return useMemo(() => {
    if (!user) return null;
    if (userData) {
      const combined = {
        ...userData,
        uid: user.uid,
        email: user.email ?? userData.email,
      };
      UserCache.setUserData(combined);
      return combined;
    }
    return UserCache.getUserData();
  }, [user, userData]);
}
