import { CLUB_HUB_MAIN_ID, clubHubSkipLinkClass } from "@/lib/club-hub/a11y";

export default function ClubHubSkipLink() {
  return (
    <a href={`#${CLUB_HUB_MAIN_ID}`} className={clubHubSkipLinkClass}>
      Skip to main content
    </a>
  );
}
