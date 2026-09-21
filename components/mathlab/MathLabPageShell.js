"use client";

import { Suspense } from "react";
import DashboardTopBar from "@/components/layout/DashboardTopBar";
import MathLabSidebar from "@/components/mathlab/MathLabSidebar";

export default function MathLabPageShell({
  children,
  className = "min-h-screen bg-background",
  contentClassName = "",
}) {
  return (
    <div className={className}>
      <DashboardTopBar title="BRHS Math Lab" />
      <Suspense fallback={null}>
        <MathLabSidebar />
      </Suspense>
      <div className={contentClassName}>{children}</div>
    </div>
  );
}
