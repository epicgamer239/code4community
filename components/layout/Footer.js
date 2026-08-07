"use client";

import Link from "next/link";
import Image from "next/image";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Work", href: "/work" },
  { label: "Contact", href: "/contact" },
];

const secondaryLinks = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
];

export default function Footer({ className = "" }) {
  return (
    <footer
      className={["bg-white border-t border-border shrink-0", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="max-w-6xl mx-auto px-6 pt-10 pb-12">
        <div className="flex justify-center mb-10">
          <Link href="/" aria-label="Code4Community home">
            <Image
              src="/brand/c4c.png"
              alt="Code4Community"
              width={40}
              height={40}
              className="w-10 h-10"
            />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 items-start text-sm text-foreground">
          <div className="text-center md:text-left space-y-3">
            <nav className="flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="underline underline-offset-2 hover:opacity-70 transition-opacity"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <p>
              Contact us at{" "}
              <a
                href="mailto:brhsc4c@gmail.com"
                className="underline underline-offset-2 hover:opacity-70 transition-opacity"
              >
                brhsc4c@gmail.com
              </a>
            </p>
          </div>

          <div className="text-center space-y-1">
            <p className="text-foreground">Made with love by Code4Community</p>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Broad Run High School, Ashburn, VA
            </p>
          </div>

          <div className="text-center md:text-right">
            <nav className="flex flex-wrap justify-center md:justify-end gap-x-4 gap-y-1">
              {secondaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="underline underline-offset-2 hover:opacity-70 transition-opacity"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
