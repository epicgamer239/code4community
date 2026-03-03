"use client";
import { useLayoutEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import DashboardTopBar from "../components/DashboardTopBar";
import Footer from "../components/Footer";

// Partner logos: add / replace with your partner images in public/
const partners = [
  { name: "S2Alliance", logo: "/s2alliance_inc_logo.jpeg", alt: "S2Alliance" },
  { name: "LCPS", logo: "/lcps.png", alt: "Loudoun County Public Schools" },
  { name: "Beaverbots", logo: "/beaverbots.png", alt: "Beaverbots Team Robots" },
];

// Icons for "what we help you build" grid
const buildItems = [
  { label: "Web apps", icon: "globe" },
  { label: "Reporting & dashboards", icon: "calc" },
  { label: "Dashboards", icon: "chart" },
  { label: "APIs & integrations", icon: "plug" },
  { label: "Automation", icon: "bolt" },
  { label: "Custom software", icon: "code" },
];

const buildIcons = {
  globe: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>,
  calc: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
  chart: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  plug: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 011-1h1a2 2 0 100-4H7a1 1 0 01-1-1V4a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>,
  bolt: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  code: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
};

export default function Home() {
  useLayoutEffect(() => {
    document.title = "Code4Community | Home";
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardTopBar title="Code4Community" showNavLinks={true} />

      {/* Split hero + dashboard */}
      <div className="flex-1 flex flex-col lg:flex-row lg:min-h-[calc(100vh-4rem)]">
        {/* Left: Hero */}
        <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:py-16 lg:pl-12 xl:pl-24 max-w-2xl">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-6">
            Your fastest path to tools that{" "}
            <span className="bg-gradient-to-r from-violet-500 via-purple-500 to-amber-500 bg-clip-text text-transparent">
              help your organization
            </span>
            <span className="inline-block w-0.5 h-8 md:h-10 ml-0.5 bg-foreground animate-pulse align-middle" aria-hidden />
          </h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
            From donor management and volunteer platforms to program dashboards and custom integrations—built for nonprofits and organizations that need to scale.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              Start for free
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

        {/* Right: What we help you build */}
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
              Donor systems, volunteer platforms, program dashboards, custom integrations—whatever your organization needs.
            </p>
          </div>
        </div>
      </div>

      {/* Trusted By / Partners */}
      <section className="border-t border-border bg-background py-16 md:py-20 px-6">
        <p className="text-center text-sm font-medium uppercase tracking-wider text-muted-foreground mb-10">
          Trusted partners of over 50 organizations
        </p>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-12 md:gap-16 items-center justify-items-center">
          {partners.map((partner) => (
            <div
              key={partner.name}
              className="flex items-center justify-center w-full aspect-[2/1] max-h-28 md:max-h-32"
            >
              <Image
                src={partner.logo}
                alt={partner.alt}
                width={280}
                height={140}
                className="object-contain w-full h-full"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Our Work - live demos; replace image areas with screenshots later if desired */}
      <section className="border-t border-border bg-muted/20 py-16 md:py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
            Our Work
          </h2>
          <p className="text-center text-sm text-muted-foreground mb-8 max-w-xl mx-auto">
            Tools we build for nonprofits and organizations—donor management, volunteer sign-up, and program reporting.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Donor dashboard", desc: "Track giving, campaigns, and donor activity in one place.", href: "/demo/donor-dashboard", image: "/donor dashboard.png" },
              { title: "Volunteer portal", desc: "Opportunity listings, sign-up, and shift management.", href: "/demo/volunteer-portal", image: "/volunteer portal.png" },
              { title: "Program reporting", desc: "Outcomes, KPIs, and grant deliverables at a glance.", href: "/demo/reporting", image: "/program reporting.png" },
            ].map((item, i) => (
              <Link
                key={i}
                href={item.href}
                className="group rounded-xl border border-border bg-background overflow-hidden shadow-sm hover:shadow-md transition-shadow block"
              >
                <div className="aspect-video bg-muted/50 border-b border-border relative overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
