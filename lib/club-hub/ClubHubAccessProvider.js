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

/** @type {(() => void) | null} */
let refreshAccessListener = null;

/** Re-load access after sponsor sync or admin changes. */
export function invalidateClubHubAccessCache() {
  refreshAccessListener?.();
}

/**
 * @param {{ children: React.ReactNode }} props
 */
export function ClubHubAccessProvider({ children }) {
  const { user, userData, loading: authLoading } = useAuth();
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
    if (authLoading) return;
    if (!userEmail) {
      applyLoaded(null, null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [overrides, access] = await Promise.all([
        fetchAllClubSponsorOverrides(),
        fetchClubHubAccessForEmail(userEmail),
      ]);
      applyLoaded(overrides, access);
    } catch (err) {
      logClientError("ClubHubAccessProvider.refresh", err);
      applyLoaded(
        {},
        null,
        err instanceof Error ? err.message : "Could not load Club Hub access.",
      );
    }
  }, [authLoading, userEmail, applyLoaded]);

  useEffect(() => {
    refreshAccessListener = () => {
      void refresh();
    };
    return () => {
      refreshAccessListener = null;
    };
  }, [refresh]);

  useEffect(() => {
    return runEffectWork(() => {
      let cancelled = false;
      if (authLoading) {
        setLoading(true);
        return () => {
          cancelled = true;
        };
      }
      if (!userEmail) {
        applyLoaded(null, null);
        return () => {
          cancelled = true;
        };
      }

      setLoading(true);
      setError("");
      (async () => {
        try {
          const [overrides, access] = await Promise.all([
            fetchAllClubSponsorOverrides(),
            fetchClubHubAccessForEmail(userEmail),
          ]);
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
  }, [authLoading, userEmail, user?.uid, applyLoaded]);

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
