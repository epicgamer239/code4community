"use client";

import { Suspense } from "react";
import DashboardTopBar from "@/components/layout/DashboardTopBar";
import MathLabSidebar from "@/components/mathlab/MathLabSidebar";
import SiteSkipLink from "@/components/common/SiteSkipLink";
import { SITE_MAIN_ID } from "@/lib/a11y/site";

export default function MathLabPageShell({
  children,
  className = "min-h-screen bg-background",
  contentClassName = "",
}) {
  return (
    <div className={className}>
      <SiteSkipLink />
      <DashboardTopBar title="BRHS Math Lab" />
      <Suspense fallback={null}>
        <MathLabSidebar />
      </Suspense>
      <main id={SITE_MAIN_ID} className={contentClassName}>
        {children}
      </main>
    </div>
  );
}
