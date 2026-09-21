"use client";

import Link from "next/link";
import Image from "next/image";

export default function MobileTopBarContent({
  isMenuOpen,
  title,
  showNavLinks,
  authReady,
  loading,
  user,
  displayName,
  closeMenu,
  setMenuOpen,
  router,
}) {
  const topBarClasses =
    "flex items-center justify-between w-full px-4 py-3 border-b border-gray-200 bg-white";
  const leftSectionClasses = "flex items-center gap-3 min-w-0 flex-1";
  const titleClasses = "font-bold text-black text-lg truncate";
  const rightSectionClasses = "flex items-center gap-2 shrink-0";

  return (
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
          onClick={() => {
            closeMenu();
            router.push("/");
          }}
          className="flex items-center gap-2 min-w-0 flex-1"
        >
          <Image src="/brand/c4c.png" alt="" width={32} height={32} className="w-8 h-8 shrink-0" />
          <span className={titleClasses}>{title}</span>
        </button>
      </div>
      {showNavLinks && (
        <div className={rightSectionClasses} suppressHydrationWarning>
          {authReady && !loading && user ? (
            <span className="text-sm text-gray-600 truncate max-w-[100px]">{displayName}</span>
          ) : (
            <>
              <Link
                href="/login"
                onClick={isMenuOpen ? closeMenu : undefined}
                className="text-sm font-medium text-black hover:text-gray-600 px-2 py-1.5 whitespace-nowrap"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                onClick={isMenuOpen ? closeMenu : undefined}
                className="text-sm font-medium bg-black text-white hover:bg-gray-800 rounded px-4 py-2 whitespace-nowrap"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
