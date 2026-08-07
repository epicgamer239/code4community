"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

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

function SidebarNavEntry({ item, isCollapsed, isMobile }) {
  const className = isMobile
    ? `flex-1 flex flex-col items-center py-3 px-2 transition-colors ${
        item.isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
      }`
    : `flex items-center p-3 rounded-lg transition-all duration-200 group w-full ${
        item.isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      }`;

  return (
    <Link href={item.href} className={className}>
      <div className="flex-shrink-0">{item.icon}</div>
      {(!isCollapsed || isMobile) && (
        <span
          className={
            isMobile ? "text-xs font-medium truncate mt-1" : "ml-3 text-sm font-medium truncate"
          }
        >
          {item.label}
        </span>
      )}
    </Link>
  );
}

/**
 * Staff sidebar matching Math Lab layout: collapsible left rail + mobile bottom nav.
 */
export default function LibraryPassSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams?.get("view") || "active";

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) setIsCollapsed(true);
  }, [isMobile]);

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

  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40 md:hidden">
        <div className="flex">
          {navigationItems.map((item) => (
            <SidebarNavEntry key={item.id} item={item} isCollapsed={false} isMobile />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`fixed left-0 top-0 bottom-0 z-40 bg-background border-r border-border transition-all duration-300 flex flex-col pt-[var(--mathlab-header-height,4.5rem)] ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="p-4 border-b border-border">
          <button
            type="button"
            onClick={() => setIsCollapsed((c) => !c)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${
                isCollapsed ? "rotate-0" : "rotate-180"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </button>
        </div>

        <nav className="p-2 space-y-1 flex-1 overflow-y-auto overscroll-contain">
          {navigationItems.map((item) => (
            <SidebarNavEntry
              key={item.id}
              item={item}
              isCollapsed={isCollapsed}
              isMobile={false}
            />
          ))}
        </nav>

        {!isCollapsed && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
            <div className="text-xs text-muted-foreground text-center">
              More features coming soon
            </div>
          </div>
        )}
      </div>

      {!isCollapsed && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-20"
          onClick={() => setIsCollapsed(true)}
        />
      )}
    </>
  );
}
