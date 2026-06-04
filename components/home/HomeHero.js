"use client";

import { useLayoutEffect, useState, useEffect } from "react";
import Link from "next/link";

const heroPhrases = [
  "help your organization",
  "scale with your mission",
  "save you time",
  "connect your teams",
  "turn data into impact",
  "power your programs",
  "grow your impact",
  "serve your community",
];

const buildItems = [
  { label: "Web apps", icon: "globe" },
  { label: "Websites for organizations", icon: "building" },
  { label: "Volunteer management tools", icon: "users" },
  { label: "Event scheduling systems", icon: "calendar" },
  { label: "Donation tracking dashboards", icon: "chart" },
  { label: "Custom software", icon: "code" },
];

const buildIcons = {
  globe: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>,
  building: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 21h16.5M3.75 9h16.5m-16.5 6h16.5M2.25 6l9 3.75L20.25 6M2.25 21V6l9 3.75 9-3.75v15" /></svg>,
  users: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  calendar: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  chart: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  code: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
};

const TYPE_MS = 70;
const DELETE_MS = 45;
const HOLD_MS = 2200;

export default function HomeHero() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayLength, setDisplayLength] = useState(() => heroPhrases[0].length);
  const [phase, setPhase] = useState("holding");

  useLayoutEffect(() => {
    document.title = "Code4Community | Home";
  }, []);

  useEffect(() => {
    let intervalId = null;
    let holdTimeoutId = null;

    if (phase === "holding") {
      holdTimeoutId = setTimeout(() => setPhase("deleting"), HOLD_MS);
      return () => clearTimeout(holdTimeoutId);
    }

    if (phase === "deleting") {
      intervalId = setInterval(() => {
        setDisplayLength((len) => {
          if (len <= 1) {
            setPhase("typing");
            setPhraseIndex((i) => (i + 1) % heroPhrases.length);
            return 0;
          }
          return len - 1;
        });
      }, DELETE_MS);
      return () => clearInterval(intervalId);
    }

    if (phase === "typing") {
      intervalId = setInterval(() => {
        setDisplayLength((len) => {
          const full = heroPhrases[(phraseIndex + heroPhrases.length) % heroPhrases.length].length;
          if (len >= full) {
            setPhase("holding");
            return full;
          }
          return len + 1;
        });
      }, TYPE_MS);
      return () => clearInterval(intervalId);
    }
  }, [phase, phraseIndex]);

  const visibleText = heroPhrases[phraseIndex].slice(0, displayLength);

  return (
    <div className="flex-1 flex flex-col lg:flex-row lg:min-h-[calc(100vh-4rem)]">
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:py-16 lg:pl-12 xl:pl-24 max-w-2xl">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-snug mb-6 overflow-visible">
          Low-Cost Digital Tools Built by Students for Our Community to{" "}
          <span className="inline-block pb-1.5 overflow-visible bg-gradient-to-r from-violet-500 via-purple-500 to-amber-500 bg-clip-text text-transparent">
            {visibleText}
          </span>
          <span className="inline-block w-0.5 h-8 md:h-10 ml-0.5 bg-foreground animate-pulse align-middle" aria-hidden />
        </h1>
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
          Code4Community is a student-led engineering club that builds <strong>custom tools and software</strong> for local nonprofits and small businesses <strong>at low cost.</strong>
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            Request a Tool
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-foreground text-foreground font-medium rounded-lg hover:bg-foreground hover:text-background transition-colors"
          >
            Get in touch
          </Link>
        </div>
      </div>

      <div className="flex-1 bg-muted/30 border-l border-border flex flex-col justify-center p-6 lg:p-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative max-w-md mx-auto w-full">
          <h2 className="text-lg font-semibold text-foreground mb-1">We help you make</h2>
          <p className="text-sm text-muted-foreground mb-6">Your idea, we build it—from concept to launch.</p>
          <div className="grid grid-cols-2 gap-3">
            {buildItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 bg-background border border-border rounded-lg px-4 py-3 shadow-sm"
              >
                <span className="flex-shrink-0 text-violet-500">{buildIcons[item.icon]}</span>
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-6 text-center">
            Websites, volunteer management tools, event scheduling, donation dashboards, custom software—whatever your organization needs.
          </p>
        </div>
      </div>
    </div>
  );
}
