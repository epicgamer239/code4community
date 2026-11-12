"use client";

import { createContext, useContext, useLayoutEffect, useMemo } from "react";
import {
  BRHS_CLUB_HUB_CONFIG,
  getClubHubConfigBySchoolId,
} from "@/lib/club-hub/schoolConfig";
import {
  popClientClubHubSchool,
  setClientClubHubSchool,
} from "@/lib/club-hub/activeSchool";

/** @type {React.Context<import("@/lib/club-hub/schoolConfig").ClubHubSchoolConfig>} */
const ClubHubSchoolContext = createContext(BRHS_CLUB_HUB_CONFIG);

/**
 * @param {{ schoolId?: string, config?: import("@/lib/club-hub/schoolConfig").ClubHubSchoolConfig, children: React.ReactNode }} props
 */
export function ClubHubSchoolProvider({ schoolId = "broad-run", config, children }) {
  const value = useMemo(
    () => config || getClubHubConfigBySchoolId(schoolId),
    [schoolId, config],
  );

  useLayoutEffect(() => {
    setClientClubHubSchool(value);
    return () => popClientClubHubSchool();
  }, [value]);

  return (
    <ClubHubSchoolContext.Provider value={value}>{children}</ClubHubSchoolContext.Provider>
  );
}

export function useClubHubSchool() {
  return useContext(ClubHubSchoolContext);
}
