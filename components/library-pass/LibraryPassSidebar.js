"use client";

import { usePathname, useSearchParams } from "next/navigation";
import CollapsibleToolSidebar from "@/components/layout/CollapsibleToolSidebar";

const limitsIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
    />
  </svg>
);

const activeIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
    />
  </svg>
);

/**
 * Staff sidebar matching Math Lab layout: collapsible left rail + mobile bottom nav.
 */
export default function LibraryPassSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams?.get("view") || "active";

  const onLibraryPass = pathname === "/library-pass";
  const navigationItems = [
    {
      id: "active",
      label: "Active Passes",
      icon: activeIcon,
      href: "/library-pass?view=active",
      isActive: onLibraryPass && view === "active",
    },
    {
      id: "limits",
      label: "Pass Limits",
      icon: limitsIcon,
      href: "/library-pass?view=limits",
      isActive: onLibraryPass && view === "limits",
    },
  ];

  return (
    <CollapsibleToolSidebar
      items={navigationItems}
      ariaLabel="Library Pass"
      showComingSoon
    />
  );
}
