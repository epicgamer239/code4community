"use client";

import Link from "next/link";
import { Suspense } from "react";
import DashboardTopBar from "@/components/layout/DashboardTopBar";
import MathLabSidebar from "@/components/mathlab/MathLabSidebar";

export default function MathLabLoginPrompt({
  redirectTo,
  title = "Sign in to continue",
  description = "Log in with your school account to use this part of Math Lab.",
}) {
  const loginHref = `/login?redirectTo=${encodeURIComponent(redirectTo)}`;
  const signupHref = `/signup?redirectTo=${encodeURIComponent(redirectTo)}`;

  return (
    <div className="min-h-screen bg-background">
      <DashboardTopBar title="BRHS Math Lab" />
      <Suspense fallback={null}>
        <MathLabSidebar />
      </Suspense>
      <div className="flex items-center justify-center ml-0 md:ml-16 pb-16 md:pb-12 px-4 py-16 min-h-[calc(100vh-5rem)]">
        <div className="max-w-md w-full text-center card-elevated p-8 rounded-2xl">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
          <p className="text-muted-foreground mb-6">{description}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={loginHref}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-foreground text-background font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              Log in
            </Link>
            <Link
              href={signupHref}
              className="inline-flex items-center justify-center px-5 py-2.5 border border-border rounded-lg font-medium hover:bg-muted/50 transition-colors"
            >
              Sign up
            </Link>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            <Link href="/mathlab" className="text-primary hover:underline">
              Back to Math Lab preview
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
