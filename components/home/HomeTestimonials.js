"use client";

import { useState } from "react";

const testimonials = [
  {
    quote:
      "Working with Code4Community was seamless. They took the time to understand our needs and delivered a tool our team actually uses every day.",
    name: "Partner Organization",
    title: "Program Lead",
  },
  {
    quote:
      "Being part of Code4Community taught me more about real product development than any classroom project. Building for local organizations made the work matter.",
    name: "Student Member",
    title: "Software Developer",
  },
  {
    quote:
      "Code4Community built us a system that saved hours of manual work each week. The students were professional, responsive, and genuinely invested in our mission.",
    name: "Community Partner",
    title: "Operations Coordinator",
  },
];

export default function HomeTestimonials() {
  const [index, setIndex] = useState(0);
  const current = testimonials[index];

  const prev = () => setIndex((i) => (i - 1 + testimonials.length) % testimonials.length);
  const next = () => setIndex((i) => (i + 1) % testimonials.length);

  return (
    <section className="bg-white border-t border-border py-16 md:py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-center mb-10 md:mb-14">
          <span className="text-foreground">Hear from </span>
          <span className="text-[#7c3aed]">Partners and Members</span>
        </h2>

        <div className="flex items-center gap-3 sm:gap-5 md:gap-8">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous testimonial"
            className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-foreground transition-opacity hover:opacity-70"
            style={{ boxShadow: "0 0 28px 10px rgba(196, 181, 253, 0.55)" }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex-1 min-w-0 border-[2px] border-[#2a2a2a] shadow-[8px_8px_0_0_#2a2a2a] bg-white px-6 sm:px-10 py-10 sm:py-12 relative">
            <span className="absolute top-5 left-6 text-3xl leading-none text-[#7c3aed] font-serif" aria-hidden>
              &ldquo;
            </span>
            <p className="text-center text-base sm:text-lg text-foreground leading-relaxed px-4 sm:px-8 min-h-[6.5rem] flex items-center justify-center">
              {current.quote}
            </p>
            <span className="absolute bottom-16 right-8 text-3xl leading-none text-[#7c3aed] font-serif hidden sm:block" aria-hidden>
              &rdquo;
            </span>
            <div className="mt-8 text-right">
              <p className="font-bold text-foreground text-sm sm:text-base">{current.name}</p>
              <p className="text-sm text-muted-foreground">{current.title}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={next}
            aria-label="Next testimonial"
            className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-foreground transition-opacity hover:opacity-70"
            style={{ boxShadow: "0 0 28px 10px rgba(196, 181, 253, 0.55)" }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
