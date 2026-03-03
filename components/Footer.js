"use client";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
          <Link 
            href="/terms" 
            className="hover:text-foreground transition-colors duration-200"
          >
            Terms of Service
          </Link>
          <span className="text-border">•</span>
          <Link 
            href="/privacy" 
            className="hover:text-foreground transition-colors duration-200"
          >
            Privacy Policy
          </Link>
        </div>
        <div className="text-center mt-2 text-xs text-muted-foreground">
          © 2026 Code4Community. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
