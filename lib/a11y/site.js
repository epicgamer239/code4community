/** Shared WCAG 2.1 AA helpers for marketing / auth shells (AppPageLayout). */

export const SITE_MAIN_ID = "site-main";

export const siteSkipLinkClass =
  "sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

/** Keyboard-only focus ring for links and controls (no visual change for mouse users). */
export const siteFocusVisibleClass =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm";

export const siteNavFocusVisibleClass =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded";
