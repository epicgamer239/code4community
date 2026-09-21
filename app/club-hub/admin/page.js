"use client";

import { useMemo } from "react";
import { useAuth } from "@/utils/AuthContext";
import { canManageClubHubRoles } from "@/lib/club-hub/access";
import ClubHubProtectedPage from "@/components/club-hub/ClubHubProtectedPage";
import ClubHubAdminDashboard from "@/components/club-hub/ClubHubAdminDashboard";

export default function ClubHubAdminPage() {
  const { user, userData } = useAuth();

  const allowed = useMemo(
    () => !!user && !!userData && canManageClubHubRoles(user.email, userData),
    [user, userData],
  );

  return (
    <ClubHubProtectedPage
      active="admin"
      loginRedirect="/club-hub/admin"
      title="Club Hub admin"
      loginMessage="Sign in with a site admin account to manage Club Hub roles."
      allowed={allowed}
    >
      <ClubHubAdminDashboard />
    </ClubHubProtectedPage>
  );
}
