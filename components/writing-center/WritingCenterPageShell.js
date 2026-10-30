"use client";

import ProductDashboardShell from "@/components/layout/ProductDashboardShell";
import WritingCenterSidebar from "@/components/writing-center/WritingCenterSidebar";

export default function WritingCenterPageShell({
  children,
  contentClassName = "ml-0 md:ml-16 flex min-h-0 flex-1 flex-col pb-16 md:pb-0",
}) {
  return (
    <ProductDashboardShell
      title="Writing Center"
      Sidebar={WritingCenterSidebar}
      contentClassName={contentClassName}
    >
      {children}
    </ProductDashboardShell>
  );
}
