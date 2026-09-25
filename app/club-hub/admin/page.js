"use client";

import { useMemo } from "react";
import { useAuth } from "@/utils/AuthContext";
import { canAccessClubHubAdminDashboard } from "@/lib/club-hub/access";
import { useClubHubAccess } from "@/lib/club-hub/useClubHubAccess";
import ClubHubProtectedPage from "@/components/club-hub/ClubHubProtectedPage";
import ClubHubAdminDashboard from "@/components/club-hub/ClubHubAdminDashboard";

export default function ClubHubAdminPage() {
  const { user, userData } = useAuth();
  const { accessRecord, loading: accessLoading } = useClubHubAccess();

  const allowed = useMemo(
    () =>
      !!user &&
      canAccessClubHubAdminDashboard({
        email: user.email,
        userData,
        accessRecord,
      }),
    [user, userData, accessRecord],
  );

  return (
    <ClubHubProtectedPage
      active="admin"
      loginRedirect="/club-hub/admin"
      title="Club Hub admin"
      loginMessage="Sign in with a Club Hub admin account (site admin or club coordinator)."
      allowed={allowed}
      accessLoading={accessLoading}
    >
      <ClubHubAdminDashboard />
    </ClubHubProtectedPage>
  );
}
