"use client";

import { useMemo } from "react";
import { useAuth } from "@/utils/AuthContext";
import { canAccessClubHubSponsorDashboard } from "@/lib/club-hub/access";
import { useClubHubAccess } from "@/lib/club-hub/useClubHubAccess";
import ClubHubProtectedPage from "@/components/club-hub/ClubHubProtectedPage";
import ClubHubSponsorDashboard from "@/components/club-hub/ClubHubSponsorDashboard";

export default function ClubHubSponsorPage() {
  const { user, userData } = useAuth();
  const { accessRecord, sponsorOverrides, editableSlugs, loading: accessLoading } =
    useClubHubAccess();

  const allowed = useMemo(() => {
    if (!user) return false;
    return canAccessClubHubSponsorDashboard({
      email: user.email,
      userData,
      accessRecord,
      sponsorOverrides,
    });
  }, [user, userData, accessRecord, sponsorOverrides]);

  return (
    <ClubHubProtectedPage
      active="sponsor"
      loginRedirect="/club-hub/sponsor"
      title="My clubs"
      loginMessage="Sign in with a club sponsor account to view rosters and metrics."
      allowed={allowed}
      accessLoading={accessLoading}
    >
      <ClubHubSponsorDashboard allowedSlugs={editableSlugs} accessLoading={accessLoading} />
    </ClubHubProtectedPage>
  );
}
