"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { useRunEffect } from "@/hooks/useRunEffect";
import { AppPageLayout } from "@/components/common/AppPageLayout";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { Notice, btnPrimary, focusRing } from "@/components/school-forum/ui";
import { forumFetch } from "@/lib/school-forum/forumClient";
import { useAuth } from "@/utils/AuthContext";

const NAV = [
  { href: "/school-forum", label: "Board", show: (caps) => caps.viewBoard },
  { href: "/school-forum/moderate", label: "Moderation", show: (caps) => caps.moderate },
  {
    href: "/school-forum/admin",
    label: "Admin",
    show: (caps) => caps.manageCycles || caps.manageStaff,
  },
];

/**
 * Page frame for every forum page: signs the user in, loads their server-resolved role,
 * and shows only the sections they can use.
 * @param {{ title: string, intro?: string, requires?: (caps: Record<string, boolean>) => boolean,
 *   children: (args: { overview: any, reload: () => Promise<void>, user: any }) => React.ReactNode }} props
 */
export default function SchoolForumShell({ title, intro, requires, children }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!user) return;
    try {
      setOverview(await forumFetch(user, "/overview"));
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, [user]);

  useRunEffect(() => {
    void reload();
  }, [reload]);

  let content;
  if (loading || (user && !overview && !error)) {
    content = (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner text="Loading the forum" />
      </div>
    );
  } else if (!user) {
    content = (
      <div className="mx-auto max-w-lg py-12 text-center">
        <p className="mb-6 text-slate-700">
          Sign in with your school account to read the board, post concerns, and vote.
        </p>
        <Link href={`/login?redirectTo=${encodeURIComponent(pathname || "/school-forum")}`} className={btnPrimary}>
          Sign in
        </Link>
      </div>
    );
  } else if (error) {
    content = (
      <div className="mx-auto max-w-xl py-10">
        <Notice kind="error" focus>
          {error.code === "not-on-roster"
            ? "The School Concerns Forum is only open to students on a participating school's roster. If you think this is a mistake, ask your SCA."
            : error.message}
        </Notice>
      </div>
    );
  } else if (requires && !requires(overview.capabilities)) {
    content = (
      <div className="mx-auto max-w-xl py-10">
        <Notice kind="error" focus>
          You don&apos;t have access to this page.{" "}
          <Link href="/school-forum" className="font-semibold underline">
            Go to the board
          </Link>
          .
        </Notice>
      </div>
    );
  } else {
    content = children({ overview, reload, user });
  }

  const nav = overview ? NAV.filter((item) => item.show(overview.capabilities)) : [];

  return (
    <AppPageLayout title="School Concerns Forum">
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
        <header className="mb-6 border-b border-border pb-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            {overview?.school ? `${overview.school.name} · SCA` : "Student Council Association (SCA)"}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">{title}</h1>
          {intro ? <p className="mt-2 max-w-3xl text-slate-700">{intro}</p> : null}
          {nav.length > 1 ? (
            <nav aria-label="School Concerns Forum" className="mt-4 print:hidden">
              <ul className="flex flex-wrap gap-2">
                {nav.map((item) => {
                  const current = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={current ? "page" : undefined}
                        className={`inline-block rounded-lg px-3 py-1.5 text-sm font-semibold ${focusRing} ${
                          current
                            ? "bg-primary text-primary-foreground"
                            : "border border-border text-foreground hover:bg-accent"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ) : null}
        </header>
        {content}
      </div>
    </AppPageLayout>
  );
}
