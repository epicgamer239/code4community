"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/utils/AuthContext";
import { auth, signOut } from "@/firebase";

const MAROON = "#5c1417";

/**
 * Club Hub top nav — same Firebase session as the rest of the site.
 * @param {{ active?: "home" | "directory" | null, loginRedirect?: string }} props
 */
export default function ClubHubNav({ active = null, loginRedirect = "/club-hub" }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setAuthReady(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    try {
      await signOut(auth);
      router.refresh();
    } catch (err) {
    }
  };

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Account";
  const loginHref = `/login?redirectTo=${encodeURIComponent(loginRedirect)}`;

  const linkClass = (isActive) =>
    isActive
      ? "underline decoration-white underline-offset-4 opacity-95 cursor-default"
      : "hover:underline underline-offset-4";

  return (
    <nav className="border-b border-black/10 shadow-md" style={{ backgroundColor: MAROON }}>
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-6 px-4 py-3.5 text-sm font-semibold tracking-wide text-white sm:gap-10 sm:text-base md:gap-12">
        <Link href="/club-hub" className={linkClass(active === "home")}>
          Home
        </Link>
        {active === "directory" ? (
          <span className={linkClass(true)}>Club Directory</span>
        ) : (
          <Link href="/club-hub/directory" className={linkClass(false)}>
            Club Directory
          </Link>
        )}
        <div className="relative" ref={dropdownRef} suppressHydrationWarning>
          {authReady && !loading && user ? (
            <>
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className="hover:underline underline-offset-4 max-w-[10rem] truncate"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                {displayName}
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 z-50 mt-2 w-44 rounded-md border border-neutral-200 bg-white py-1 text-left text-sm font-medium text-neutral-900 shadow-lg">
                  <Link
                    href="/settings"
                    className="block px-3 py-2 hover:bg-neutral-50"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="block w-full px-3 py-2 text-left hover:bg-neutral-50"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </>
          ) : (
            <Link href={loginHref} className="hover:underline underline-offset-4">
              Log in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
