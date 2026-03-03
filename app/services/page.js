"use client";

import { useLayoutEffect, useEffect, useRef, useState } from "react";
import Link from "next/link";
import DashboardTopBar from "../../components/DashboardTopBar";

/** Centered rectangle (not full-width). Expands to fit content; no internal scrolling. */
function SlideContent({ leftText, rightContent, className = "" }) {
  return (
    <div className={`w-full max-w-4xl mx-auto flex flex-col bg-white border-2 border-black rounded-lg overflow-hidden shadow-sm min-h-[280px] ${className}`}>
      <div className="flex flex-col md:flex-row">
        <div className="flex-1 p-8 md:p-10 flex items-center bg-white min-w-0">
          <p className="text-[1.35rem] md:text-[1.5rem] leading-snug text-black font-normal">
            {leftText}
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 md:p-8 bg-[#ffdbdb] border-l border-[#f7b8b8] min-w-0">
          {rightContent}
        </div>
      </div>
    </div>
  );
}

function Slide1Graphic() {
  return (
    <div className="w-full max-w-md space-y-3">
      <div className="flex items-end gap-1 h-16">
        {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
          <div key={i} className="flex-1 bg-blue-300 rounded-t min-h-[20%]" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="bg-white rounded-lg border border-blue-200 p-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
          <span className="font-medium text-black">your-project</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700 truncate">your-org.org/custom-dashboard</span>
          <span className="ml-auto shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-500 text-white">Live</span>
        </div>
      </div>
      <div className="h-8 bg-blue-800 rounded flex items-center pl-2 gap-1">
        <span className="w-2 h-2 rounded-full bg-blue-400" />
        <span className="w-2 h-2 rounded-full bg-blue-400" />
        <span className="w-2 h-2 rounded-full bg-blue-400" />
      </div>
      <div className="h-12 bg-blue-200 rounded border border-blue-300" />
    </div>
  );
}

/** What we deliver: custom software types with delivered/ready badges */
function WhatWeDeliverPanel() {
  const items = [
    { name: "Donor & CRM systems", status: "Delivered", type: "Custom web app", icon: "heart" },
    { name: "Volunteer portals", status: "Delivered", type: "Custom web app", icon: "users" },
    { name: "Program dashboards", status: "Delivered", type: "Reporting", icon: "chart" },
    { name: "Integrations & APIs", status: "Ready", type: "Custom", icon: "plug" },
  ];
  return (
    <div className="w-full max-w-md">
      <div className="flex items-center justify-between gap-4 mb-5">
        <h3 className="text-lg font-bold text-black">What we deliver</h3>
        <span className="text-sm text-[#6b7280] flex items-center gap-1.5 shrink-0">
          <span className="text-green-600" aria-hidden>✓</span>
          Built for your organization
        </span>
      </div>
      <div className="divide-y divide-[#e5e7eb]">
        {items.map((s) => (
          <div key={s.name} className="py-3 first:pt-0 flex items-center gap-3">
            {s.icon === "heart" && <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
            {s.icon === "users" && <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
            {s.icon === "chart" && <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            {s.icon === "plug" && <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 011-1h1a2 2 0 100-4H7a1 1 0 01-1-1V4a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-black text-base">{s.name}</p>
              <p className="text-sm text-[#6b7280]">{s.type}</p>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 text-green-800 text-sm font-medium shrink-0">
              <span aria-hidden>✓</span> {s.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const SLIDE_LOCK_MS = 1000; // Can't go to next slide or scroll past until animation (1s) is done

const SNAP_HOLD_MS = 400; // After snapping to section, keep forcing scroll position to fight momentum

const MOBILE_BREAKPOINT = 768;

export default function Services() {
  const scrollSectionRef = useRef(null);
  const sectionWasBelowRef = useRef(false);
  const lockedUntilRef = useRef(0);
  const slideIndexRef = useRef(0);
  const snapHoldUntilRef = useRef(0);
  const [slideIndex, setSlideIndex] = useState(0);
  const [isDesktop, setIsDesktop] = useState(true);

  useLayoutEffect(() => {
    slideIndexRef.current = slideIndex;
  }, [slideIndex]);

  useLayoutEffect(() => {
    document.title = "Code4Community | Services";
  }, []);

  useEffect(() => {
    const m = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px)`);
    setIsDesktop(m.matches);
    const f = () => setIsDesktop(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);

  // Run on every scroll (desktop only). Catch fast overshoot and hold position to fight momentum.
  useEffect(() => {
    if (!isDesktop) return;
    const section = scrollSectionRef.current;
    if (!section) return;

    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const targetTop = section.offsetTop;
      const now = Date.now();

      if (rect.top >= vh) sectionWasBelowRef.current = true;

      // After a snap we keep forcing scroll position for a short time so momentum doesn't blow past
      if (now < snapHoldUntilRef.current) {
        if (Math.abs((window.scrollY ?? window.pageYOffset) - targetTop) > 3) {
          window.scrollTo({ top: targetTop, behavior: "auto" });
        }
        return;
      }

      // Coming up from below: section is in viewport or we already blew past it → snap and hold
      if (sectionWasBelowRef.current && (rect.bottom < 0 || (rect.bottom > 0 && rect.top < vh))) {
        sectionWasBelowRef.current = false;
        setSlideIndex(2);
        lockedUntilRef.current = now + SLIDE_LOCK_MS;
        snapHoldUntilRef.current = now + SNAP_HOLD_MS;
        window.scrollTo({ top: targetTop, behavior: "auto" });
        return;
      }

      const inView = rect.top <= vh * 0.15 && rect.bottom >= vh * 0.85;
      if (!inView) return;

      const current = slideIndexRef.current;
      const scrollY = window.scrollY ?? window.pageYOffset;

      if (current === 0 && scrollY < targetTop) return;
      if (current === 2 && scrollY > targetTop) return;
      if (Math.abs(scrollY - targetTop) <= 2) return;

      window.scrollTo({ top: targetTop, behavior: "auto" });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isDesktop]);

  // In section: wheel + touch (desktop only). Change slides or allow past on slide 0/2.
  useEffect(() => {
    if (!isDesktop) return;
    const section = scrollSectionRef.current;
    if (!section) return;

    const handleWheel = (e) => {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      // Only activate slide logic when the section is mostly on screen (the thing you're on)
      const inView = rect.top <= vh * 0.15 && rect.bottom >= vh * 0.85;
      const now = Date.now();
      const locked = now < lockedUntilRef.current;

      if (rect.top >= vh) sectionWasBelowRef.current = true;

      // Scrolling up from below: stop at the section so they can't skip past it
      if (e.deltaY < 0 && sectionWasBelowRef.current && rect.bottom > 0 && rect.top < vh) {
        e.preventDefault();
        sectionWasBelowRef.current = false;
        setSlideIndex(2);
        lockedUntilRef.current = now + SLIDE_LOCK_MS;
        window.scrollTo({ top: section.offsetTop, behavior: "smooth" });
        return;
      }

      if (inView && sectionWasBelowRef.current) {
        sectionWasBelowRef.current = false;
        setSlideIndex(2);
        lockedUntilRef.current = now + SLIDE_LOCK_MS;
      }
      if (!inView) return;

      if (locked) {
        e.preventDefault();
        return;
      }

      if (e.deltaY > 0) {
        if (slideIndex < 2) {
          e.preventDefault();
          setSlideIndex((i) => i + 1);
          lockedUntilRef.current = now + SLIDE_LOCK_MS;
        }
      } else {
        if (slideIndex > 0) {
          e.preventDefault();
          setSlideIndex((i) => i - 1);
          lockedUntilRef.current = now + SLIDE_LOCK_MS;
        }
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });

    // Touch support for mobile: swipe up/down to change slides
    let touchStartY = 0;
    const minSwipe = 50;

    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
      const section = scrollSectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const inView = rect.top <= vh * 0.15 && rect.bottom >= vh * 0.85;
      if (!inView) return;

      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchStartY - touchEndY;
      const now = Date.now();
      if (now < lockedUntilRef.current) return;

      if (deltaY > minSwipe && slideIndexRef.current < 2) {
        setSlideIndex((i) => i + 1);
        lockedUntilRef.current = now + SLIDE_LOCK_MS;
      } else if (deltaY < -minSwipe && slideIndexRef.current > 0) {
        setSlideIndex((i) => i - 1);
        lockedUntilRef.current = now + SLIDE_LOCK_MS;
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [slideIndex, isDesktop]);

  return (
    <div className="min-h-screen w-full bg-white flex flex-col overflow-x-hidden">
      <div className="bg-background">
        <DashboardTopBar title="Code4Community" showNavLinks={true} />
      </div>

      {/* Subtle geometric pattern on the right */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute right-0 top-0 bottom-0 w-[55%] max-w-[800px] opacity-90">
          <svg className="absolute inset-0 w-full h-full text-[#f0f0f0]" viewBox="0 0 400 600" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="280" y="80" width="64" height="48" rx="4" fill="currentColor" />
            <rect x="320" y="200" width="56" height="56" rx="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <rect x="260" y="320" width="72" height="40" rx="4" fill="currentColor" />
            <rect x="300" y="420" width="48" height="64" rx="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <rect x="340" y="520" width="60" height="44" rx="4" fill="currentColor" />
            <rect x="240" y="140" width="48" height="48" rx="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <rect x="360" y="280" width="40" height="56" rx="4" fill="currentColor" />
            <rect x="270" y="480" width="56" height="32" rx="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center px-6 py-20 md:py-28">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-black leading-tight mb-6">
            Custom software for any organization
          </h1>
          <p className="text-lg text-[#4a4a4a] max-w-xl mx-auto mb-10 leading-relaxed">
            We build software that fits how you work—dashboards, donor systems, volunteer tools, and full-scale platforms. From idea to launch, we can make grand things happen. <strong className="font-semibold text-[#333]">So you can focus on your mission.</strong>
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-black text-white font-medium hover:bg-[#222] transition-colors"
            >
              Get Started for Free
              <span aria-hidden>&gt;</span>
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-white text-black font-medium border border-black hover:bg-gray-50 transition-colors"
            >
              Talk to an Expert
              <span aria-hidden>&gt;</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Mobile: simple vertical stack of all three slides, no transitions (only render when not desktop so we never show desktop slide section after) */}
      {!isDesktop && (
        <section className="w-full bg-white px-4 pb-8">
          <h2 className="text-[2rem] font-bold text-black text-center pt-8 pb-6 px-4">
            Whatever your organization needs...
          </h2>
          <div className="space-y-6 max-w-4xl mx-auto">
            <SlideContent
              leftText="from a rough idea or a spreadsheet that's outgrown itself"
              rightContent={<Slide1Graphic />}
            />
            <SlideContent
              leftText="to custom dashboards, tools, and systems built for how you work."
              rightContent={<WhatWeDeliverPanel />}
            />
            <SlideContent
              leftText="We build it right, ship it, and stand behind it—so you can think bigger."
              rightContent={
                <div className="w-full max-w-md flex flex-col gap-3">
                  <div className="h-12 bg-blue-100 rounded-lg border border-blue-200 flex items-center px-4 text-blue-800 font-medium">Scope</div>
                  <div className="h-12 bg-blue-100 rounded-lg border border-blue-200 flex items-center px-4 text-blue-800 font-medium">Build</div>
                  <div className="h-12 bg-blue-100 rounded-lg border border-blue-200 flex items-center px-4 text-blue-800 font-medium">{"Ship & support"}</div>
                </div>
              }
            />
          </div>
        </section>
      )}

      {/* Desktop: single-slide view with wheel/touch transitions and scroll lock (only render when desktop) */}
      {isDesktop && (
      <section ref={scrollSectionRef} className="relative w-full bg-white flex flex-col h-screen">
        <h2 className="text-[2.5rem] lg:text-[2.75rem] font-bold text-black text-center pt-8 pb-6 shrink-0 px-4">
          Whatever your organization needs...
        </h2>
        <div className="flex-1 min-h-0 overflow-hidden relative px-6 lg:px-10 pb-8 flex flex-col items-center justify-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute inset-0 w-full flex items-center justify-center px-6 lg:px-10 pb-8 transition-transform duration-[1000ms] ease-out pt-0"
              style={{
                zIndex: i,
                transform: slideIndex >= i ? "translateY(0)" : "translateY(100%)",
              }}
            >
              {i === 0 && (
                <SlideContent
                  leftText="from a rough idea or a spreadsheet that’s outgrown itself"
                  rightContent={<Slide1Graphic />}
                />
              )}
              {i === 1 && (
                <SlideContent
                  leftText="to custom dashboards, tools, and systems built for how you work."
                  rightContent={<WhatWeDeliverPanel />}
                />
              )}
              {i === 2 && (
                <SlideContent
                  leftText="We build it right, ship it, and stand behind it—so you can think bigger."
                  rightContent={
                    <div className="w-full max-w-md flex flex-col gap-3">
                      <div className="h-12 bg-blue-100 rounded-lg border border-blue-200 flex items-center px-4 text-blue-800 font-medium">Scope</div>
                      <div className="h-12 bg-blue-100 rounded-lg border border-blue-200 flex items-center px-4 text-blue-800 font-medium">Build</div>
                      <div className="h-12 bg-blue-100 rounded-lg border border-blue-200 flex items-center px-4 text-blue-800 font-medium">{"Ship & support"}</div>
                    </div>
                  }
                />
              )}
            </div>
          ))}
        </div>
      </section>
      )}

      {/* After scrolling through the 3 slides, you land here */}
      <section className="bg-[#f5f5f5] px-6 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="h-1 flex">
              <div className="flex-1 bg-indigo-500" aria-hidden />
              <div className="flex-1 bg-[#ffdbdb]" aria-hidden />
            </div>
            <div className="p-10 md:p-14 text-center">
              <p className="text-xl md:text-2xl text-black font-normal leading-snug">
                Code4Community&apos;s custom software is built to power your organization from idea to impact.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
