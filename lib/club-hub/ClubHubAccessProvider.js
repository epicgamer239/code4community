"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/utils/AuthContext";
import {
  canEditClubHubPage,
  getEditableClubSlugsForUser,
} from "@/lib/club-hub/access";
import { fetchClubHubAccessForEmail } from "@/lib/club-hub/clubHubRoles";
import { fetchAllClubSponsorOverrides } from "@/lib/club-hub/clubSponsors";
import { logClientError } from "@/lib/auth/logClientError";
import { runEffectWork } from "@/hooks/runEffectWork";

/** @type {React.Context<null | ClubHubAccessContextValue>} */
const ClubHubAccessContext = createContext(null);

/** @typedef {{
 *   accessRecord: Record<string, unknown> | null,
 *   sponsorOverrides: Record<string, { name: string, email: string }[]> | null,
 *   loading: boolean,
 *   error: string,
 *   refresh: () => Promise<void>,
 *   editableSlugs: string[],
 *   canEdit: (slug: string) => boolean,
 * }} ClubHubAccessContextValue */

let sharedLoadPromise = null;
/** @type {{ overrides: Record<string, { name: string, email: string }[]> | null, access: Record<string, unknown> | null, email: string | null, accessLoadFailed?: boolean } | null} */
let sharedCache = null;

async function loadClubHubAccessState(userEmail) {
  const normalizedEmail = userEmail || null;
  if (
    sharedCache &&
    sharedCache.email === normalizedEmail &&
    sharedCache.overrides !== null &&
    !sharedCache.accessLoadFailed
  ) {
    return { overrides: sharedCache.overrides, access: sharedCache.access };
  }

  if (!sharedLoadPromise) {
    sharedLoadPromise = (async () => {
      const overrides = await fetchAllClubSponsorOverrides();
      if (!normalizedEmail) {
        return { overrides, access: null, accessLoadFailed: false };
      }
      try {
        const access = await fetchClubHubAccessForEmail(normalizedEmail);
        return { overrides, access, accessLoadFailed: false };
      } catch {
        return { overrides, access: null, accessLoadFailed: true };
      }
    })().finally(() => {
      sharedLoadPromise = null;
    });
  }

  const result = await sharedLoadPromise;
  sharedCache = {
    email: normalizedEmail,
    overrides: result.overrides,
    access: result.access,
    accessLoadFailed: result.accessLoadFailed === true,
  };
  return result;
}

/** Invalidate module cache after admin sponsor changes. */
export function invalidateClubHubAccessCache() {
  sharedCache = null;
  sharedLoadPromise = null;
}

/**
 * @param {{ children: React.ReactNode }} props
 */
export function ClubHubAccessProvider({ children }) {
  const { user, userData } = useAuth();
  const userEmail = user?.email;
  const [accessRecord, setAccessRecord] = useState(null);
  const [sponsorOverrides, setSponsorOverrides] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const applyLoaded = useCallback((overrides, access, errMessage = "") => {
    setSponsorOverrides(overrides);
    setAccessRecord(access);
    setError(errMessage);
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    invalidateClubHubAccessCache();
    setLoading(true);
    setError("");
    try {
      const { overrides, access } = await loadClubHubAccessState(userEmail);
      applyLoaded(overrides, access);
    } catch (err) {
      logClientError("ClubHubAccessProvider.refresh", err);
      applyLoaded(
        {},
        null,
        err instanceof Error ? err.message : "Could not load Club Hub access.",
      );
    }
  }, [userEmail, applyLoaded]);

  useEffect(() => {
    return runEffectWork(() => {
      let cancelled = false;
      setLoading(true);
      setError("");
      (async () => {
        try {
          const { overrides, access } = await loadClubHubAccessState(userEmail);
          if (cancelled) return;
          applyLoaded(overrides, access);
        } catch (err) {
          if (cancelled) return;
          logClientError("ClubHubAccessProvider", err);
          applyLoaded(
            {},
            null,
            err instanceof Error ? err.message : "Could not load Club Hub access.",
          );
        }
      })();
      return () => {
        cancelled = true;
      };
    });
  }, [userEmail, applyLoaded]);

  const editableSlugs = useMemo(
    () =>
      getEditableClubSlugsForUser({
        email: userEmail,
        userData,
        accessRecord,
        sponsorOverrides,
      }),
    [userEmail, userData, accessRecord, sponsorOverrides],
  );

  const canEdit = useCallback(
    (slug) =>
      Boolean(
        user &&
          userData &&
          canEditClubHubPage({
            email: user.email,
            slug,
            userData,
            accessRecord,
            sponsorOverrides,
          }),
      ),
    [user, userData, accessRecord, sponsorOverrides],
  );

  const value = useMemo(
    () => ({
      accessRecord,
      sponsorOverrides,
      loading,
      error,
      refresh,
      editableSlugs,
      canEdit,
    }),
    [accessRecord, sponsorOverrides, loading, error, refresh, editableSlugs, canEdit],
  );

  return (
    <ClubHubAccessContext.Provider value={value}>{children}</ClubHubAccessContext.Provider>
  );
}

/** @returns {ClubHubAccessContextValue} */
export function useClubHubAccess() {
  const ctx = useContext(ClubHubAccessContext);
  if (!ctx) {
    throw new Error("useClubHubAccess must be used within ClubHubAccessProvider");
  }
  return ctx;
}
