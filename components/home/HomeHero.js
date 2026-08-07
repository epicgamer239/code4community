"use client";

import { useLayoutEffect, useState, useEffect } from "react";
import Image from "next/image";
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

const heroPhotos = [
  { src: "/group-pics/IMG_4044.png", alt: "Code4Community team on the stairs", position: "top-[2%] left-[4%]" },
  { src: "/group-pics/IMG_8371.png", alt: "Code4Community team at a hackathon", position: "top-[32%] right-[4%]" },
  { src: "/group-pics/IMG_0636-2.png", alt: "Code4Community presenting in a classroom", position: "bottom-[2%] left-[4%]" },
];

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
    <div className="flex-1 flex flex-col lg:flex-row lg:h-[calc(100vh-4rem)] lg:min-h-[calc(100vh-4rem)] lg:max-h-[calc(100vh-4rem)] lg:overflow-hidden">
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:py-16 lg:pl-12 xl:pl-24 max-w-2xl min-h-0">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-snug mb-6 overflow-visible">
          Software Solutions designed to{" "}
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

      <div className="flex-1 bg-muted/30 border-l border-border relative overflow-hidden min-h-[70vh] lg:min-h-0">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="absolute inset-0 p-4 lg:p-5">
          {heroPhotos.map((photo) => (
            <div
              key={photo.src}
              className={`absolute aspect-square h-[38%] max-w-[58%] bg-[#2a2a2a] border-[3px] border-[#2a2a2a] shadow-[7px_7px_0_0_#2a2a2a] ${photo.position}`}
            >
              <div className="relative w-full h-full overflow-hidden">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="240px"
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
