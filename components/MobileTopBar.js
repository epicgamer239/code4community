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

  return (
    <>
      {/* Top bar: hamburger + logo + title | Sign In + Get Started */}
      <header className={`md:hidden bg-white border-b border-gray-200 px-4 py-3 relative z-40 ${pathname === "/" || pathname === "/services" ? "mb-0" : "mb-6"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="p-2 -ml-2 text-black hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-gray-300"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => { closeMenu(); router.push("/"); }}
              className="flex items-center gap-2 min-w-0"
            >
              <Image src="/c4c.png" alt="" width={32} height={32} className="w-8 h-8 shrink-0" />
              <span className="font-bold text-black text-lg truncate">{title}</span>
            </button>
          </div>
          {showNavLinks && !loading && (
            <div className="flex items-center gap-2 shrink-0">
              {user ? (
                <span className="text-sm text-gray-600 truncate max-w-[100px]">{displayName}</span>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm font-medium text-black hover:text-gray-600 px-2 py-1.5"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="text-sm font-medium bg-black text-white hover:bg-gray-800 rounded px-4 py-2"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Full-screen menu overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-white flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          {/* Menu top bar: X + logo + title | Sign In + Get Started */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={closeMenu}
                className="p-2 -ml-2 text-black hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-gray-300"
                aria-label="Close menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <Image src="/c4c.png" alt="" width={32} height={32} className="w-8 h-8" />
                <span className="font-bold text-black text-lg">{title}</span>
              </div>
            </div>
            {!loading && (
              <div className="flex items-center gap-2">
                {user ? (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="text-sm font-medium text-black hover:text-gray-600 px-2 py-1.5"
                  >
                    Sign out
                  </button>
                ) : (
                  <>
                    <Link href="/login" onClick={closeMenu} className="text-sm font-medium text-black hover:text-gray-600 px-2 py-1.5">
                      Sign In
                    </Link>
                    <Link href="/signup" onClick={closeMenu} className="text-sm font-medium bg-black text-white hover:bg-gray-800 rounded px-4 py-2">
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            )}
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
