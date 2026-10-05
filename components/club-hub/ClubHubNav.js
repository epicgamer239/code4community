"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/utils/AuthContext";
import { logClientError } from "@/lib/auth/logClientError";
import {
  canAccessClubHubAdminDashboard,
  canAccessClubHubSponsorDashboard,
  canManageClubHubRoles,
} from "@/lib/club-hub/access";
import { useClubHubAccess } from "@/lib/club-hub/useClubHubAccess";
import { clubHubNavLinkActiveClass, clubHubNavLinkClass } from "@/lib/club-hub/a11y";
import { CLUB_HUB_MAROON } from "@/lib/club-hub/theme";
import { auth, signOut } from "@/firebase";

/**
 * Club Hub top nav — same Firebase session as the rest of the site.
 * @param {{ active?: "home" | "directory" | "meeting-days" | "admin" | "sponsor" | null, loginRedirect?: string }} props
 */
export default function ClubHubNav({ active = null, loginRedirect = "/club-hub" }) {
  const { user, userData, loading } = useAuth();
  const { accessRecord, sponsorOverrides } = useClubHubAccess();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const showAdminLink =
    !!user &&
    canAccessClubHubAdminDashboard({
      email: user.email,
      userData,
      accessRecord,
    });
  const adminNavLabel = canManageClubHubRoles(user?.email, userData, accessRecord)
    ? "Admin"
    : "Rosters";
  const showSponsorLink =
    !!user &&
    canAccessClubHubSponsorDashboard({
      email: user.email,
      userData,
      accessRecord,
      sponsorOverrides,
    });

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    try {
      await signOut(auth);
      router.refresh();
    } catch (err) {
      logClientError("ClubHubNav.signOut", err);
    }
  };

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Account";
  const loginHref = `/login?redirectTo=${encodeURIComponent(loginRedirect)}`;

  const menuId = "club-hub-account-menu";

  function navItem(label, isActive, href) {
    if (isActive) {
      return (
        <span className={clubHubNavLinkActiveClass} aria-current="page">
          {label}
        </span>
      );
    }
    return (
      <Link href={href} className={clubHubNavLinkClass}>
        {label}
      </Link>
    );
  }

  return (
    <nav
      className="border-b border-black/10 shadow-md"
      style={{ backgroundColor: CLUB_HUB_MAROON }}
      aria-label="Club Hub"
    >
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-6 px-4 py-[1.006rem] text-sm font-semibold tracking-wide text-white sm:gap-10 sm:text-base md:gap-12">
        {navItem("Home", active === "home", "/club-hub")}
        {navItem("Club Directory", active === "directory", "/club-hub/directory")}
        {user
          ? navItem("Meeting days", active === "meeting-days", "/club-hub/meeting-days")
          : null}
        {showSponsorLink ? navItem("My clubs", active === "sponsor", "/club-hub/sponsor") : null}
        {showAdminLink ? navItem(adminNavLabel, active === "admin", "/club-hub/admin") : null}
        <div className="relative" ref={dropdownRef} suppressHydrationWarning>
          {!loading && user ? (
            <>
              <button
                type="button"
                id="club-hub-account-trigger"
                onClick={() => setDropdownOpen((o) => !o)}
                className={`max-w-[10rem] truncate ${clubHubNavLinkClass}`}
                aria-expanded={dropdownOpen}
                aria-haspopup="menu"
                aria-controls={menuId}
                aria-label={`Account menu for ${displayName}`}
              >
                {displayName}
              </button>
              {dropdownOpen && (
                <div
                  id={menuId}
                  role="menu"
                  aria-labelledby="club-hub-account-trigger"
                  className="absolute right-0 z-50 mt-2 w-44 rounded-md border border-neutral-200 bg-white py-1 text-left text-sm font-medium text-neutral-900 shadow-lg"
                >
                  <Link
                    href="/settings"
                    role="menuitem"
                    className="block px-3 py-2 text-neutral-900 hover:bg-neutral-50 focus:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#5c1417]"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Settings
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    className="block w-full px-3 py-2 text-left text-neutral-900 hover:bg-neutral-50 focus:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#5c1417]"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </>
          ) : (
            <Link href={loginHref} className={clubHubNavLinkClass}>
              Log in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
