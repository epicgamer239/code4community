import { ClubHubAccessProvider } from "@/lib/club-hub/ClubHubAccessProvider";

/** Overrides root viewport so Club Hub passes Lighthouse zoom (WCAG 1.4.4). */
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function ClubHubLayout({ children }) {
  return <ClubHubAccessProvider>{children}</ClubHubAccessProvider>;
}
