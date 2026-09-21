import { ClubHubAccessProvider } from "@/lib/club-hub/ClubHubAccessProvider";

export default function ClubHubLayout({ children }) {
  return <ClubHubAccessProvider>{children}</ClubHubAccessProvider>;
}
