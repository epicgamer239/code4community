"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/utils/AuthContext";
import { auth, signOut } from "@/firebase";
import { useIsClient } from "@/hooks/useIsClient";
import MobileTopBarContent from "@/components/layout/MobileTopBarContent";

const BASE_NAV_LINKS = [
  { label: "HOME", path: "/" },
  { label: "ABOUT US", path: "/about" },
  { label: "WORK", path: "/work" },
  { label: "CONTACT", path: "/contact" },
];
export default function MobileTopBar({ title = "Code4Community", showNavLinks = true }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const authReady = useIsClient();

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
    }
  };

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Account";
  const topBarProps = {
    title,
    showNavLinks,
    authReady,
    loading,
    user,
    displayName,
    closeMenu,
    setMenuOpen,
    router,
  };

  return (
    <>
      {/* Top bar: always same layout */}
      <header
        className={`md:hidden relative z-40 ${
          !showNavLinks || pathname === "/" || pathname === "/services" || pathname === "/work"
            ? "mb-0"
            : "mb-6"
        }`}
      >
        <MobileTopBarContent isMenuOpen={false} {...topBarProps} />
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
            <MobileTopBarContent isMenuOpen={true} {...topBarProps} />
          </div>

          {/* Nav links */}
          {showNavLinks && (
            <nav className="flex-1 overflow-auto py-2">
              {(() => {
                const links = authReady && user
                  ? [...BASE_NAV_LINKS, { label: "SETTINGS", path: "/settings" }]
                  : [...BASE_NAV_LINKS];
                return links.map((link) => {
                  const isActive =
                    pathname === link.path ||
                    (link.path !== "/" && pathname?.startsWith(`${link.path}/`));
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
                });
              })()}
              {authReady && user && (
                <div className="border-b border-gray-100">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-4 text-base font-medium text-black hover:bg-gray-50 transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </nav>
          )}
        </div>
      )}
    </>
  );
}
