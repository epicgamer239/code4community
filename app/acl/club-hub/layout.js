import { ClubHubAccessProvider } from "@/lib/club-hub/ClubHubAccessProvider";
import { ClubHubSchoolProvider } from "@/lib/club-hub/ClubHubSchoolProvider";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata = {
  title: "Academies Club Hub",
  description: "Club directory and rosters for Academies of Loudoun.",
};

export default function AclClubHubLayout({ children }) {
  return (
    <ClubHubSchoolProvider schoolId="acl">
      <ClubHubAccessProvider>{children}</ClubHubAccessProvider>
    </ClubHubSchoolProvider>
  );
}
