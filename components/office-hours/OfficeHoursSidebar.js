"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/utils/AuthContext";
import { isAdminUser, isTeacherOrAdmin, isTutorOrHigher } from "@/utils/authorization";
import { OFFICE_HOURS_SCHEDULER } from "@/lib/mathlab/schedulerConfig";

const calendarIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

export default function OfficeHoursSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, userData, loading: authLoading } = useAuth();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) setIsCollapsed(true);
  }, [isMobile]);

  const canManage =
    userData &&
    user &&
    (isTeacherOrAdmin(userData.role) ||
      isTutorOrHigher(userData.role, userData.mathLabRole) ||
      isAdminUser(userData.role, user.email));

  const items = [
    {
      id: "book",
      label: "Book a slot",
      href: OFFICE_HOURS_SCHEDULER.bookPath,
      isActive: pathname === OFFICE_HOURS_SCHEDULER.bookPath,
      requiresAuth: !user && !authLoading,
    },
    ...(canManage
      ? [
          {
            id: "manage",
            label: "Manage slots",
            href: OFFICE_HOURS_SCHEDULER.managePath,
            isActive: pathname === OFFICE_HOURS_SCHEDULER.managePath,
            requiresAuth: false,
          },
        ]
      : []),
  ];

  const navClass = (active) =>
    isMobile
      ? `flex-1 flex flex-col items-center py-3 px-2 transition-colors ${
          active ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
        }`
      : `flex items-center p-3 rounded-lg transition-all duration-200 w-full ${
          active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        }`;

  const onNav = (item) => {
    if (item.requiresAuth) {
      router.push(`/login?redirectTo=${encodeURIComponent(item.href)}`);
    }
  };

  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40 md:hidden">
        <div className="flex">
          {items.map((item) =>
            item.requiresAuth ? (
              <button
                key={item.id}
                type="button"
                onClick={() => onNav(item)}
                className={navClass(item.isActive)}
              >
                {calendarIcon}
                <span className="text-xs font-medium truncate mt-1">{item.label}</span>
              </button>
            ) : (
              <Link key={item.id} href={item.href} className={navClass(item.isActive)}>
                {calendarIcon}
                <span className="text-xs font-medium truncate mt-1">{item.label}</span>
              </Link>
            )
          )}
        </div>
      </div>
    );
  }

  return (
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>
      <nav className="p-2 space-y-1 flex-1">
        {items.map((item) =>
          item.requiresAuth ? (
            <button
              key={item.id}
              type="button"
              onClick={() => onNav(item)}
              className={navClass(item.isActive)}
            >
              {calendarIcon}
              {!isCollapsed && <span className="ml-3 text-sm font-medium truncate">{item.label}</span>}
            </button>
          ) : (
            <Link key={item.id} href={item.href} className={navClass(item.isActive)}>
              {calendarIcon}
              {!isCollapsed && <span className="ml-3 text-sm font-medium truncate">{item.label}</span>}
            </Link>
          )
        )}
      </nav>
    </div>
  );
}
