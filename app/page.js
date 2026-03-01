"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import Image from "next/image";
import DashboardTopBar from "../components/DashboardTopBar";
import Footer from "../components/Footer";

export default function Home() {
  const router = useRouter();
  
  useLayoutEffect(() => {
    document.title = "Code4Community | Home";
  }, []);
  const [projectsCount, setProjectsCount] = useState(0);
  const [hoursCount, setHoursCount] = useState(0);
  const [currentPartner, setCurrentPartner] = useState(0);
  const statsRef = useRef(null);
  const autoScrollIntervalRef = useRef(null);
  const pauseTimeoutRef = useRef(null);
  const isPausedRef = useRef(false);
  const hasAnimatedRef = useRef(false);

  // Partner logos - add more as needed
  const partners = [
    { name: "S2Alliance", logo: "/s2alliance_inc_logo.jpeg", alt: "S2Alliance Logo" },
  ];

  const nextPartner = () => {
    setCurrentPartner((prev) => (prev + 1) % partners.length);
    // Pause auto-scroll for 30 seconds when manually navigating
    pauseAutoScroll();
  };

  const prevPartner = () => {
    setCurrentPartner((prev) => (prev - 1 + partners.length) % partners.length);
    // Pause auto-scroll for 30 seconds when manually navigating
    pauseAutoScroll();
  };

  const pauseAutoScroll = () => {
    // Clear existing pause timeout if any
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }
    
    // Clear auto-scroll interval
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
    
    // Set paused state
    isPausedRef.current = true;
    
    // Resume after 30 seconds
    pauseTimeoutRef.current = setTimeout(() => {
      isPausedRef.current = false;
      // Restart auto-scroll
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
      if (!isPausedRef.current) {
        autoScrollIntervalRef.current = setInterval(() => {
          setCurrentPartner((prev) => (prev + 1) % partners.length);
        }, 10000);
      }
    }, 30000);
  };

  const targetProjects = 50; // Adjust this to your actual number
  const targetHours = 1000; // Adjust this to your actual number

  // Auto-scroll carousel
  useEffect(() => {
    // Only start auto-scroll if there's more than 1 partner
    if (partners.length > 1) {
      // Clear any existing interval
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
      
      // Start auto-scroll if not paused
      if (!isPausedRef.current) {
        autoScrollIntervalRef.current = setInterval(() => {
          setCurrentPartner((prev) => (prev + 1) % partners.length);
        }, 10000); // 10 seconds
      }
    }

    return () => {
      // Cleanup intervals and timeouts
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
    };
  }, [partners.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimatedRef.current) {
            hasAnimatedRef.current = true;
            
            // Animate projects counter
            const projectsDuration = 2000; // 2 seconds
            const projectsSteps = 60;
            const projectsIncrement = targetProjects / projectsSteps;
            const projectsInterval = projectsDuration / projectsSteps;
            
            let projectsCurrent = 0;
            const projectsTimer = setInterval(() => {
              projectsCurrent += projectsIncrement;
              if (projectsCurrent >= targetProjects) {
                setProjectsCount(targetProjects);
                clearInterval(projectsTimer);
              } else {
                setProjectsCount(Math.floor(projectsCurrent));
              }
            }, projectsInterval);

            // Animate hours counter
            const hoursDuration = 2000; // 2 seconds
            const hoursSteps = 60;
            const hoursIncrement = targetHours / hoursSteps;
            const hoursInterval = hoursDuration / hoursSteps;
            
            let hoursCurrent = 0;
            const hoursTimer = setInterval(() => {
              hoursCurrent += hoursIncrement;
              if (hoursCurrent >= targetHours) {
                setHoursCount(targetHours);
                clearInterval(hoursTimer);
              } else {
                setHoursCount(Math.floor(hoursCurrent));
              }
            }, hoursInterval);
            
            // Unobserve after animation starts to prevent re-triggering
            if (statsRef.current) {
              observer.unobserve(statsRef.current);
            }
          }
        });
      },
      { threshold: 0.3 } // Trigger when 30% of the element is visible
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => {
      if (statsRef.current) {
        observer.unobserve(statsRef.current);
      }
    };
  }, [targetProjects, targetHours]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardTopBar 
        title="Code4Community" 
        showNavLinks={true}
      />

      {/* Hero Banner Section */}
      <div className="relative bg-[#0066CC] text-white py-20 md:py-32 px-6">
        {/* Left Chevron */}
        <button className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Right Chevron */}
        <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Centered Content */}
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Tools That Help Your Organization
          </h1>
          <p className="text-base md:text-lg leading-relaxed max-w-3xl mx-auto text-white">
            Code4Community builds software tools for teams and organizations—grade calculators, 
            seating charts, yearbook formatting, and more. We help the community through technology.
          </p>
        </div>
      </div>

      {/* What is Code4Community */}
      <div className="bg-background py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            What is Code4Community?
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-4">
            Code4Community is a team that designs and builds web tools for organizations and the community. 
            We create apps that support productivity and collaboration, so teams get useful tools and we deliver 
            real value through software development, design, and teamwork.
          </p>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            All our tools are free to use and built with privacy in mind. 
            To learn who we are, visit <a href="/about" className="text-primary hover:underline">About Us</a>. 
            For questions or feedback, see our <a href="/contact" className="text-primary hover:underline">Contact</a> page.
          </p>
        </div>
      </div>

      {/* Mission Section */}
      <div className="bg-background py-16 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Our Mission
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            To support organizations and the community with practical software tools, building 
            things that teams and users actually use.
          </p>
        </div>
      </div>

      {/* Stats Section */}
      <div ref={statsRef} className="bg-background py-16 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {/* Projects Counter - Left */}
            <div className="text-center flex flex-col items-center justify-center">
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                {projectsCount}+
              </div>
              <div className="text-lg text-muted-foreground">
                Projects Made
              </div>
            </div>

            {/* Trusted Partners - Middle */}
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Trusted Partners
              </div>
              <div className="relative flex justify-center">
                {/* Partner Logo Box */}
                <div className="bg-background border-2 border-border rounded-lg p-8 w-[400px] h-[240px] flex flex-col items-center justify-center relative">
                  {partners.length > 0 && (
                    <Image
                      src={partners[currentPartner].logo}
                      alt={partners[currentPartner].alt}
                      width={300}
                      height={160}
                      className="object-contain max-h-[180px]"
                    />
                  )}
                  
                  {/* Partner Indicators - inside box at bottom */}
                  {partners.length > 1 && (
                    <div className="absolute bottom-2 flex justify-center gap-2">
                      {partners.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setCurrentPartner(index);
                            pauseAutoScroll();
                          }}
                          className={`w-2.5 h-2.5 rounded-full transition-colors ${
                            index === currentPartner ? 'bg-foreground' : 'bg-muted-foreground'
                          }`}
                          aria-label={`Go to partner ${index + 1}`}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Left Arrow - only show if more than 1 partner */}
                  {partners.length > 1 && (
                    <button
                      onClick={prevPartner}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                      aria-label="Previous partner"
                    >
                      <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  
                  {/* Right Arrow - only show if more than 1 partner */}
                  {partners.length > 1 && (
                    <button
                      onClick={nextPartner}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                      aria-label="Next partner"
                    >
                      <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div className="text-base text-muted-foreground mt-4">
                Working with organizations to deliver quality solutions
              </div>
            </div>

            {/* Hours Worked Counter - Right */}
            <div className="text-center flex flex-col items-center justify-center">
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                {hoursCount}+
              </div>
              <div className="text-lg text-muted-foreground">
                Hours Worked
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
