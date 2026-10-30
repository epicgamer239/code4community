"use client";

import ProductDashboardShell from "@/components/layout/ProductDashboardShell";
import MathLabSidebar from "@/components/mathlab/MathLabSidebar";

export default function MathLabPageShell({
  children,
  className = "min-h-screen bg-background flex flex-col",
  contentClassName = "",
}) {
  return (
    <ProductDashboardShell
      title="BRHS Math Lab"
      Sidebar={MathLabSidebar}
      className={className}
      contentClassName={contentClassName}
    >
      {children}
    </ProductDashboardShell>
  );
}
