"use client";
import { useState, useRef, useEffect } from "react";
import { useIsClient } from "@/hooks/useIsClient";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/utils/AuthContext";
import { auth, signOut } from "@/firebase";
import MobileTopBar from "@/components/layout/MobileTopBar";
import { siteFocusVisibleClass, siteNavFocusVisibleClass } from "@/lib/a11y/site";

export default function DashboardTopBar({ title = "Code4Community", onNavigation, showNavLinks = true }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const authReady = useIsClient();
  const dropdownRef = useRef(null);

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
      router.push("/");
      router.refresh();
    } catch (err) {
    }
  };

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Account";

  const publicNavLinks = [
    { label: "HOME", path: "/" },
    { label: "ABOUT US", path: "/about" },
    { label: "WORK", path: "/work" },
    { label: "CONTACT", path: "/contact" },
  ];
  const navLinks = publicNavLinks;
  // Tool shells use a left sidebar fixed below the header; keep the top bar sticky
  // so scrolling doesn't leave a gap above the sidebar.
  const isToolShell =
    pathname?.startsWith("/mathlab") ||
    pathname?.startsWith("/office-hours") ||
    pathname?.startsWith("/library-pass");
  const headerSticky = isToolShell
    ? "sticky top-0 z-50 bg-background shadow-sm"
    : pathname === "/" || pathname === "/services" || pathname === "/work"
      ? "relative z-40"
      : "relative z-40 mb-6";

  return (
    <>
      {isToolShell ? (
        <div className="md:hidden sticky top-0 z-50 bg-background border-b border-border">
          <MobileTopBar title={title} showNavLinks={showNavLinks} />
        </div>
      ) : (
        <MobileTopBar title={title} showNavLinks={showNavLinks} />
      )}
      <header
        className={`hidden md:block border-b border-border px-6 py-4 bg-background ${headerSticky}`}
      >
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            {/* Logo and Title on Left */}
            <div className="flex items-center space-x-3">
              <Image
                src="/brand/c4c.png"
                alt="Code4Community Logo"
                width={40}
                height={40}
                className="w-10 h-10"
              />
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className={`text-xl font-semibold text-foreground hover:text-primary transition-colors cursor-pointer text-left ${siteNavFocusVisibleClass}`}
                  title="Go to Home"
                >
                  {title}
                </button>
                <p className="text-xs text-muted-foreground">
                  Student Developers Building Tools for the Community
                </p>
              </div>
            </div>

            {/* Navigation Links + CTAs or User Menu on Right */}
            {showNavLinks && (
              <nav className="flex items-center space-x-4 md:space-x-6" aria-label="Primary">
                {navLinks.map((link) => {
                  const isActive =
                    pathname === link.path ||
                    (link.path !== "/" && pathname?.startsWith(`${link.path}/`));
                  return (
                    <button
                      key={link.path}
                      type="button"
                      onClick={() => router.push(link.path)}
                      aria-current={isActive ? "page" : undefined}
                      className={`text-sm font-medium transition-colors ${siteNavFocusVisibleClass} ${
                        isActive
                          ? "text-primary"
                          : "text-foreground hover:text-primary"
                      }`}
                    >
                      {link.label}
                    </button>
                  );
                })}
                <div className="flex items-center ml-2 pl-4 border-l border-border" suppressHydrationWarning>
                  {authReady && !loading && user ? (
                    <div className="relative" ref={dropdownRef}>
                      <button
                        type="button"
                        id="site-account-menu-trigger"
                        onClick={() => setDropdownOpen((o) => !o)}
                        className={`flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors rounded px-2 py-1.5 ${siteNavFocusVisibleClass}`}
                        aria-expanded={dropdownOpen}
                        aria-haspopup="menu"
                        aria-controls="site-account-menu"
                        aria-label={`Account menu for ${displayName}`}
                      >
                        <span className="max-w-[120px] truncate md:max-w-[180px]" aria-hidden>
                          {displayName}
                        </span>
                        <svg
                          className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {dropdownOpen && (
                        <div
                          id="site-account-menu"
                          role="menu"
                          aria-labelledby="site-account-menu-trigger"
                          className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border bg-background py-1 shadow-lg z-50"
                        >
                          <Link
                            href="/settings"
                            role="menuitem"
                            onClick={() => setDropdownOpen(false)}
                            className={`block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted focus:outline-none focus-visible:bg-muted ${siteFocusVisibleClass}`}
                          >
                            Settings
                          </Link>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={handleSignOut}
                            className={`block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted focus:outline-none focus-visible:bg-muted ${siteFocusVisibleClass}`}
                          >
                            Sign out
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Link
                        href="/login"
                        className={`text-sm font-medium text-foreground hover:text-primary transition-colors px-3 py-1.5 ${siteNavFocusVisibleClass}`}
                      >
                        Log in
                      </Link>
                      <Link
                        href="/signup"
                        className={`text-sm font-medium bg-foreground text-background hover:opacity-90 transition-opacity rounded px-4 py-2 ${siteNavFocusVisibleClass}`}
                      >
                        Get started
                      </Link>
                    </div>
                  )}
                </div>
              </nav>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
