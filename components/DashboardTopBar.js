"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { auth, signOut } from "@/firebase";
import MobileTopBar from "@/components/MobileTopBar";

export default function DashboardTopBar({ title = "Code4Community", onNavigation, showNavLinks = true }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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
      console.error("Sign out error:", err);
    }
  };

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Account";

  const navLinks = [
    { label: "HOME", path: "/" },
    { label: "ABOUT US", path: "/about" },
    { label: "SERVICES", path: "/services" },
    { label: "CONTACT", path: "/contact" },
  ];

  return (
    <>
      <MobileTopBar title={title} showNavLinks={showNavLinks} />
      <header className={`hidden md:block bg-background border-b border-border px-6 py-4 relative z-40 ${pathname === '/' || pathname === '/services' ? 'mb-0' : 'mb-6'}`}>
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
                  onClick={() => router.push("/")}
                  className="text-xl font-semibold text-foreground hover:text-primary transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded text-left"
                  title="Go to Home"
                >
                  {title}
                </button>
                <p className="text-xs text-muted-foreground">
                  YOUR PARTNER IN SOFTWARE SOLUTIONS
                </p>
              </div>
            </div>

            {/* Navigation Links + CTAs or User Menu on Right */}
            {showNavLinks && (
              <nav className="flex items-center space-x-4 md:space-x-6">
                {navLinks.map((link) => {
                  const isActive = pathname === link.path;
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
                <div className="flex items-center ml-2 pl-4 border-l border-border">
                  {!loading && user ? (
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
