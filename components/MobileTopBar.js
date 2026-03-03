"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { auth, signOut } from "@/firebase";

const NAV_LINKS = [
  { label: "HOME", path: "/" },
  { label: "ABOUT US", path: "/about" },
  { label: "SERVICES", path: "/services" },
  { label: "CONTACT", path: "/contact" },
];

export default function MobileTopBar({ title = "Code4Community", showNavLinks = true }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (menuOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const handleNav = (path) => {
    router.push(path);
    closeMenu();
  };

  const handleSignOut = async () => {
    closeMenu();
    try {
      await signOut(auth);
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Account";

  // Same top bar layout in both states so it never looks different (no overlap/smush)
  const topBarClasses = "flex items-center justify-between w-full px-4 py-3 border-b border-gray-200 bg-white";
  const leftSectionClasses = "flex items-center gap-3 min-w-0 flex-1";
  const titleClasses = "font-bold text-black text-lg truncate";
  const rightSectionClasses = "flex items-center gap-2 shrink-0";

  const TopBarContent = ({ isMenuOpen }) => (
    <div className={topBarClasses}>
      <div className={leftSectionClasses}>
        {isMenuOpen ? (
          <button
            type="button"
            onClick={closeMenu}
            className="p-2 -ml-2 text-black hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-gray-300 shrink-0"
            aria-label="Close menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="p-2 -ml-2 text-black hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-gray-300 shrink-0"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={() => { closeMenu(); router.push("/"); }}
          className="flex items-center gap-2 min-w-0 flex-1"
        >
          <Image src="/c4c.png" alt="" width={32} height={32} className="w-8 h-8 shrink-0" />
          <span className={titleClasses}>{title}</span>
        </button>
      </div>
      {showNavLinks && !loading && (
        <div className={rightSectionClasses}>
          {user ? (
            <span className="text-sm text-gray-600 truncate max-w-[100px]">{displayName}</span>
          ) : (
            <>
              <Link href="/login" onClick={isMenuOpen ? closeMenu : undefined} className="text-sm font-medium text-black hover:text-gray-600 px-2 py-1.5 whitespace-nowrap">
                Sign In
              </Link>
              <Link href="/signup" onClick={isMenuOpen ? closeMenu : undefined} className="text-sm font-medium bg-black text-white hover:bg-gray-800 rounded px-4 py-2 whitespace-nowrap">
                Get Started
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Top bar: always same layout */}
      <header className={`md:hidden relative z-40 ${pathname === "/" || pathname === "/services" ? "mb-0" : "mb-6"}`}>
        <TopBarContent isMenuOpen={false} />
      </header>

      {/* Full-screen menu overlay: same top bar at top, then nav links */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-white flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <div className="shrink-0">
            <TopBarContent isMenuOpen={true} />
          </div>

          {/* Nav links */}
          {showNavLinks && (
            <nav className="flex-1 overflow-auto py-2">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.path;
                return (
                  <div key={link.path} className="border-b border-gray-100">
                    <button
                      type="button"
                      onClick={() => handleNav(link.path)}
                      className={`w-full text-left px-4 py-4 text-base font-medium transition-colors ${
                        isActive ? "text-primary" : "text-black hover:bg-gray-50"
                      }`}
                    >
                      {link.label}
                    </button>
                  </div>
                );
              })}
            </nav>
          )}
        </div>
      )}
    </>
  );
}
