"use client";

import { Suspense } from "react";
import DashboardTopBar from "@/components/layout/DashboardTopBar";
import SiteSkipLink from "@/components/common/SiteSkipLink";
import { SITE_MAIN_ID } from "@/lib/a11y/site";

/**
 * Shared Math Lab / Writing Center (and similar) signed-in layout.
 * @param {{
 *   title: string,
 *   Sidebar: import("react").ComponentType,
 *   children: import("react").ReactNode,
 *   className?: string,
 *   contentClassName?: string,
 * }} props
 */
export default function ProductDashboardShell({
  title,
  Sidebar,
  children,
  className = "min-h-screen bg-background flex flex-col",
  contentClassName = "",
}) {
  return (
    <div className={className}>
      <SiteSkipLink />
      <DashboardTopBar title={title} />
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <main
        id={SITE_MAIN_ID}
        className={["outline-none", contentClassName].filter(Boolean).join(" ")}
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}
