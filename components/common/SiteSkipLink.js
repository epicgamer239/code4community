import { SITE_MAIN_ID, siteSkipLinkClass } from "@/lib/a11y/site";

export default function SiteSkipLink() {
  return (
    <a href={`#${SITE_MAIN_ID}`} className={siteSkipLinkClass}>
      Skip to main content
    </a>
  );
}
