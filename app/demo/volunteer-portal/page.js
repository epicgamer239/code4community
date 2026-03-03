"use client";

import { useLayoutEffect } from "react";
import Image from "next/image";
import Link from "next/link";

const opportunities = [
  { title: "Food drive — Warehouse sorting", org: "Community Kitchen", date: "Sat, Mar 8", spots: "12 spots left", tag: "On-site" },
  { title: "Tutoring — Math & reading", org: "After School Program", date: "Mon–Thu ongoing", spots: "3 spots left", tag: "Recurring" },
  { title: "Event setup — Spring gala", org: "Arts Council", date: "Fri, Mar 15", spots: "8 spots left", tag: "One-time" },
  { title: "Phone banking — Fundraiser", org: "Youth Center", date: "Tue, Mar 12", spots: "5 spots left", tag: "Remote" },
];

export default function VolunteerPortalDemo() {
  useLayoutEffect(() => {
    document.title = "Volunteer Portal | Code4Community Demo";
  }, []);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Demo bar */}
      <div className="bg-foreground text-background px-4 py-2 flex items-center justify-between text-sm">
        <span className="font-medium">Volunteer Portal — Demo</span>
        <Link href="/" className="text-background/80 hover:text-white transition-colors">
          ← Back to Code4Community
        </Link>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-primary/5 border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
          <div className="flex items-center gap-3 mb-4">
            <Image src="/c4c.png" alt="C4C" width={40} height={40} />
            <span className="text-sm font-medium text-muted-foreground">Volunteer Portal</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Find your next opportunity</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Sign up for one-time or recurring shifts. Filter by cause, date, and location.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <input
              type="text"
              placeholder="Search opportunities..."
              className="px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary"
              readOnly
            />
            <select className="px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" defaultValue="">
              <option value="">All causes</option>
              <option>Education</option>
              <option>Hunger relief</option>
              <option>Events</option>
            </select>
            <select className="px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" defaultValue="">
              <option value="">Any date</option>
              <option>This week</option>
              <option>This month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Opportunities grid */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h2 className="text-lg font-semibold text-foreground mb-6">Open opportunities</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {opportunities.map((opp, i) => (
            <div
              key={i}
              className="bg-background rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">{opp.tag}</span>
                  <h3 className="text-base font-semibold text-foreground mt-2">{opp.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{opp.org}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <span className="text-sm text-muted-foreground">{opp.date}</span>
                <span className="text-xs text-muted-foreground">{opp.spots}</span>
              </div>
              <button
                type="button"
                className="mt-4 w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
              >
                Sign up
              </button>
            </div>
          ))}
        </div>

        {/* Upcoming shifts (mock) */}
        <div className="mt-12 bg-background rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Your upcoming shifts</h2>
          </div>
          <div className="divide-y divide-border">
            {[
              { role: "Warehouse sorting", org: "Community Kitchen", when: "Sat, Mar 8 · 9:00 AM – 12:00 PM" },
              { role: "Tutoring — Math", org: "After School Program", when: "Mon, Mar 11 · 3:00 PM – 5:00 PM" },
            ].map((s, i) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{s.role}</p>
                  <p className="text-sm text-muted-foreground">{s.org} · {s.when}</p>
                </div>
                <button type="button" className="text-sm text-primary hover:underline">Details</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
