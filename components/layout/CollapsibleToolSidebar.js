"use client";

import { useState } from "react";
import Link from "next/link";
import { useIsMobile } from "@/hooks/useIsMobile";

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   href: string,
 *   icon: import("react").ReactNode,
 *   isActive?: boolean,
 *   requiresAuth?: boolean,
 * }} ToolSidebarItem
 */

/**
 * @param {{
 *   item: ToolSidebarItem,
 *   isCollapsed: boolean,
 *   isMobile: boolean,
 *   onRequireAuth?: (href: string) => void,
 * }} props
 */
export function ToolSidebarNavEntry({ item, isCollapsed, isMobile, onRequireAuth }) {
  const iconOnlyLabel = isCollapsed && !isMobile ? item.label : undefined;
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
      <button
        type="button"
        onClick={() => onRequireAuth?.(item.href)}
        className={className}
        aria-label={iconOnlyLabel || item.label}
      >
        {inner}
      </button>
    );
  }

  return (
    <Link
      href={item.href}
      className={className}
      aria-label={iconOnlyLabel}
      aria-current={item.isActive ? "page" : undefined}
    >
      {inner}
    </Link>
  );
}

/**
 * Shared Math Lab / Writing Center / Library Pass / Office Hours chrome.
 * @param {{
 *   items: ToolSidebarItem[],
 *   ariaLabel: string,
 *   onRequireAuth?: (href: string) => void,
 *   showComingSoon?: boolean,
 * }} props
 */
export default function CollapsibleToolSidebar({
  items,
  ariaLabel,
  onRequireAuth,
  showComingSoon = false,
}) {
  const isMobile = useIsMobile();
  const [desktopCollapsed, setDesktopCollapsed] = useState(true);
  const isCollapsed = isMobile ? true : desktopCollapsed;

  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40 md:hidden">
        <nav className="flex" aria-label={ariaLabel}>
          {items.map((item) => (
            <ToolSidebarNavEntry
              key={item.id}
              item={item}
              isCollapsed={false}
              isMobile
              onRequireAuth={onRequireAuth}
            />
          ))}
        </nav>
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
          onClick={() => setDesktopCollapsed((prev) => !prev)}
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
      <nav className="p-2 space-y-1 flex-1 overflow-y-auto overscroll-contain" aria-label={ariaLabel}>
        {items.map((item) => (
          <ToolSidebarNavEntry
            key={item.id}
            item={item}
            isCollapsed={isCollapsed}
            isMobile={false}
            onRequireAuth={onRequireAuth}
          />
        ))}
      </nav>
      {showComingSoon && !isCollapsed ? (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <div className="text-xs text-muted-foreground text-center">More features coming soon</div>
        </div>
      ) : null}
    </div>
  );
}
