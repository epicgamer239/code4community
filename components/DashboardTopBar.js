"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/utils/AuthContext";
import { auth, signOut } from "@/firebase";
import MobileTopBar from "@/components/MobileTopBar";

export default function DashboardTopBar({ title = "Code4Community", onNavigation, showNavLinks = true }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
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
  const isMathLabBar = !showNavLinks;
  const headerSticky = isMathLabBar
    ? "sticky top-0 z-50 bg-background shadow-sm"
    : pathname === "/" || pathname === "/services" || pathname === "/work"
      ? "relative z-40"
      : "relative z-40 mb-6";

  return (
    <>
      {isMathLabBar ? (
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
                src="/c4c.png"
                alt="Code4Community Logo"
                width={40}
                height={40}
                className="w-10 h-10"
              />
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="text-xl font-semibold text-foreground hover:text-primary transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded text-left"
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
              <nav className="flex items-center space-x-4 md:space-x-6">
                {navLinks.map((link) => {
                  const isActive =
                    pathname === link.path ||
                    (link.path !== "/" && pathname?.startsWith(`${link.path}/`));
                  return (
                    <button
                      key={link.path}
                      onClick={() => router.push(link.path)}
                      className={`text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded ${
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
                        onClick={() => setDropdownOpen((o) => !o)}
                        className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded px-2 py-1.5"
                        aria-expanded={dropdownOpen}
                        aria-haspopup="true"
                      >
                        <span className="max-w-[120px] truncate md:max-w-[180px]">
                          {displayName}
                        </span>
                        <svg
                          className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {dropdownOpen && (
                        <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border bg-background py-1 shadow-lg z-50">
                          <Link
                            href="/settings"
                            onClick={() => setDropdownOpen(false)}
                            className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted focus:outline-none focus:bg-muted"
                          >
                            Settings
                          </Link>
                          <button
                            type="button"
                            onClick={handleSignOut}
                            className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted focus:outline-none focus:bg-muted"
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
                        className="text-sm font-medium text-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded px-3 py-1.5"
                      >
                        Log in
                      </Link>
                      <Link
                        href="/signup"
                        className="text-sm font-medium bg-foreground text-background hover:opacity-90 transition-opacity rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
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
