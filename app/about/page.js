"use client";
import { useLayoutEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import DashboardTopBar from "../../components/DashboardTopBar";
import Footer from "../../components/Footer";

// Hero background: team collaboration (Unsplash, free to use)
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80";

const team = [
  { name: "Shail Shah", role: "President & Head Developer", image: "/shail.jpg" },
  { name: "Pranav Natarajan", role: "Co-President & Head of Outreach", image: "/pranav.jpg" },
  { name: "Aryan Kothari", role: "Vice President & Developer", image: "/aryan.jpg" },
];

export default function AboutUs() {
  useLayoutEffect(() => {
    document.title = "Code4Community | About Us";
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardTopBar title="Code4Community" showNavLinks={true} />

      {/* Hero: full-width with blurred background image, extends to top bar */}
      <div className="relative text-white py-20 md:py-28 px-6 md:px-12 lg:px-16 overflow-hidden -mt-6">
        <div className="absolute inset-0">
          <Image
            src={HERO_IMAGE}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-slate-800/75" aria-hidden />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Built for the{" "}
            <span className="relative inline-block">
              community.
              <span className="absolute bottom-1 left-0 w-full h-1 bg-amber-400 rounded-full" aria-hidden />
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-2">
            Code4Community comes straight from the source.
          </p>
          <p className="text-base text-white/80">
            Practical tools you can trust.
          </p>
        </div>
      </div>

      {/* Content: image left + narrative + Contact button right, contained width */}
      <div className="bg-background py-16 md:py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-5 gap-10 md:gap-12 items-start">
            <div className="md:col-span-2">
              <div className="aspect-square max-w-xs relative rounded-lg overflow-hidden bg-muted shadow-md border border-border flex items-center justify-center p-6">
                <Image
                  src="/c4c.png"
                  alt="Code4Community logo"
                  width={200}
                  height={200}
                  className="object-contain w-full h-full"
                />
              </div>
            </div>
            <div className="md:col-span-3">
              <h2 className="text-2xl font-bold text-foreground mb-4">About Code4Community</h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  Code4Community was started to build software that organizations and teams could actually use. We build donor management systems, volunteer coordination platforms, program dashboards, intake systems, and custom integrations that nonprofits and organizations rely on.
                </p>
                <p>
                  Our goal is to help organizations and the community through technology—building the tools and software they need to work better. We focus on practical, free solutions that make a real difference for teams and users. This site is created and run by our core team; everything you see here is built by us.
                </p>
              </div>
              <Link
                href="/contact"
                className="inline-block mt-6 px-6 py-3 bg-background border-2 border-foreground text-foreground font-medium rounded-lg hover:bg-foreground hover:text-background transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Team section: centered title + row of headshots, name, title only */}
      <div className="bg-background border-t border-border py-16 md:py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-12 font-serif">
            Code4Community Team
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 md:gap-12">
            {team.map((member) => (
              <div key={member.name} className="flex flex-col items-center text-center">
                <div className="w-40 h-40 rounded-lg overflow-hidden bg-muted border border-border shadow-sm mb-4 flex-shrink-0">
                  <Image
                    src={member.image}
                    alt={member.name}
                    width={160}
                    height={160}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1 font-serif">
                  {member.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {member.role}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
