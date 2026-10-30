"use client";

import { usePathname } from "next/navigation";
import CollapsibleToolSidebar from "@/components/layout/CollapsibleToolSidebar";

const writingCenterIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);

const historyIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

export default function WritingCenterSidebar() {
  const pathname = usePathname();

  const navigationItems = [
    {
      id: "writing-center",
      label: "Writing Center",
      icon: writingCenterIcon,
      href: "/writing-center",
      isActive: pathname === "/writing-center",
    },
    {
      id: "history",
      label: "Session History",
      icon: historyIcon,
      href: "/writing-center/history",
      isActive: pathname === "/writing-center/history",
    },
  ];

  return <CollapsibleToolSidebar items={navigationItems} ariaLabel="Writing Center" />;
}
