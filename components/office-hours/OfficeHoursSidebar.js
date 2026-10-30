"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/utils/AuthContext";
import { isAdminUser, isTeacherOrAdmin, isTutorOrHigher } from "@/utils/authorization";
import { OFFICE_HOURS_SCHEDULER } from "@/lib/mathlab/schedulerConfig";
import CollapsibleToolSidebar from "@/components/layout/CollapsibleToolSidebar";

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
  const router = useRouter();
  const pathname = usePathname();
  const { user, userData, loading: authLoading } = useAuth();

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
      icon: calendarIcon,
      href: OFFICE_HOURS_SCHEDULER.bookPath,
      isActive: pathname === OFFICE_HOURS_SCHEDULER.bookPath,
      requiresAuth: !user && !authLoading,
    },
    ...(canManage
      ? [
          {
            id: "manage",
            label: "Manage slots",
            icon: calendarIcon,
            href: OFFICE_HOURS_SCHEDULER.managePath,
            isActive: pathname === OFFICE_HOURS_SCHEDULER.managePath,
            requiresAuth: false,
          },
        ]
      : []),
  ];

  const promptLogin = (href) => {
    router.push(`/login?redirectTo=${encodeURIComponent(href)}`);
  };

  return (
    <CollapsibleToolSidebar
      items={items}
      ariaLabel="Office Hours"
      onRequireAuth={promptLogin}
    />
  );
}
