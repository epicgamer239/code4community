"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/utils/AuthContext";
import { isAdminUser, isTutorOrHigher } from "@/utils/authorization";
import { mathlabLoginPath } from "@/lib/mathlab/guest";

function SidebarNavEntry({ item, isCollapsed, isMobile, onRequireAuth }) {
  const className = isMobile
    ? `flex-1 flex flex-col items-center py-3 px-2 transition-colors ${
        item.isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
      }`
    : `flex items-center p-3 rounded-lg transition-all duration-200 group w-full ${
        item.isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      }`;
  const inner = (
    <>
      <div className="flex-shrink-0">{item.icon}</div>
      {(!isCollapsed || isMobile) && (
        <span className={isMobile ? "text-xs font-medium truncate mt-1" : "ml-3 text-sm font-medium truncate"}>
          {item.label}
        </span>
      )}
    </>
  );
  if (item.requiresAuth) {
    return (
      <button type="button" onClick={() => onRequireAuth(item.href)} className={className}>
        {inner}
      </button>
    );
  }
  return (
    <Link href={item.href} className={className}>
      {inner}
    </Link>
  );
}

export default function MathLabSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, userData, loading: authLoading } = useAuth();
  const isGuest = !authLoading && !user;

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-collapse on mobile
  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true);
    }
  }, [isMobile]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const promptLogin = (href) => {
    router.push(mathlabLoginPath(href));
  };

  const isAdmin = userData && user && isAdminUser(userData.role, user.email);
  const isTutor = userData && user && isTutorOrHigher(userData.role, userData.mathLabRole);
  const navigationItems = [];

  if (isGuest) {
    const bulb = (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    );
    const clock = (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
    navigationItems.push({ id: "mathlab", label: "Math Lab", icon: bulb, href: "/mathlab", requiresAuth: false, isActive: pathname === "/mathlab" });
    navigationItems.push({ id: "history", label: "Session History", icon: clock, href: "/mathlab/history", requiresAuth: true, isActive: pathname === "/mathlab/history" });
  } else if (isAdmin) {
    // For admins: Math Lab, Tutor Dashboard, Session History, Session Tracking
    navigationItems.push({
      id: "mathlab-student",
      label: "Math Lab",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      href: "/mathlab?view=student",
      requiresAuth: false,
      isActive: pathname === "/mathlab" && searchParams?.get('view') === 'student'
    });
    navigationItems.push({
      id: "mathlab",
      label: "Tutor Dashboard",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      href: "/mathlab",
      isActive: pathname === "/mathlab" && searchParams?.get('view') !== 'student'
    });
    navigationItems.push({
      id: "history",
      label: "Session History",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      href: "/mathlab/history",
      isActive: pathname === "/mathlab/history"
    });
    navigationItems.push({
      id: "session-tracking",
      label: "Session Tracking",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      href: "/mathlab/session-tracking",
      isActive: pathname === "/mathlab/session-tracking"
    });
    navigationItems.push({
      id: "admin-dashboard",
      label: "Admin Dashboard",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
      href: "/mathlab/admin",
      isActive: pathname === "/mathlab/admin"
    });
  } else {
    // For non-admins: Math Lab (student view), Tutor Dashboard (if tutor), Session History
    if (isTutor) {
      // Tutors can access both student and tutor views
      navigationItems.push({
        id: "mathlab-student",
        label: "Math Lab",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        ),
        href: "/mathlab?view=student",
        isActive: pathname === "/mathlab" && searchParams?.get('view') === 'student'
      });
      navigationItems.push({
        id: "mathlab",
        label: "Tutor Dashboard",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        ),
        href: "/mathlab",
        isActive: pathname === "/mathlab" && searchParams?.get('view') !== 'student'
      });
    } else {
      // Regular students only see Math Lab
      navigationItems.push({
        id: "mathlab",
        label: "Math Lab",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        ),
        href: "/mathlab",
        isActive: pathname === "/mathlab"
      });
    }
    navigationItems.push({
      id: "history",
      label: "Session History",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      href: "/mathlab/history",
      isActive: pathname === "/mathlab/history"
    });
  }

  // On mobile, render a bottom navigation bar instead
  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40 md:hidden">
        <div className="flex">
          {navigationItems.map((item) => (
            <SidebarNavEntry
              key={item.id}
              item={item}
              isCollapsed={false}
              isMobile
              onRequireAuth={promptLogin}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 bottom-0 z-40 bg-background border-r border-border transition-all duration-300 flex flex-col pt-[var(--mathlab-header-height,4.5rem)] ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Toggle Button */}
        <div className="p-4 border-b border-border">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg 
              className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${
                isCollapsed ? 'rotate-0' : 'rotate-180'
              }`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-2 space-y-1 flex-1 overflow-y-auto overscroll-contain">
          {navigationItems.map((item) => (
            <SidebarNavEntry
              key={item.id}
              item={item}
              isCollapsed={isCollapsed}
              isMobile={false}
              onRequireAuth={promptLogin}
            />
          ))}
        </nav>

        {/* Bottom Section - Future expansion */}
        {!isCollapsed && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
            <div className="text-xs text-muted-foreground text-center">
              More features coming soon
            </div>
          </div>
        )}
      </div>

      {/* Backdrop for mobile when expanded */}
      {!isCollapsed && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-20"
          onClick={() => setIsCollapsed(true)}
        />
      )}
    </>
  );
}
