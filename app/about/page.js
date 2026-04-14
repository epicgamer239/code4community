"use client";
import { useLayoutEffect, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Lato } from "next/font/google";
import DashboardTopBar from "../../components/DashboardTopBar";
import Footer from "../../components/Footer";

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80";

const STUDENT_BIO =
  "A sophomore at Broad Run High School who realized their skills could help the community and decided to join Code4Community to pitch in.";

const leadership = [
  {
    name: "Shail Shah",
    role: "President & Head Developer",
    image: "/shail.jpg",
    bio: "Has over five years of experience in the software industry. An experienced programmer and software architect with leadership skills and an entrepreneurial drive, he started Code4Community in 2023.",
  },
  {
    name: "Pranav Natarajan",
    role: "Co-President & Head of Outreach",
    image: "/pranav.jpg",
    bio: "Has over three years of experience in the product engineering industry. He collaborates with clients, plans and executes technical efforts aimed at software development, mediating between various departments, involving them in work, and coordinating activities.",
  },
  {
    name: "Aryan Kothari",
    role: "Vice President & Developer",
    image: "/aryan.jpg",
    bio: "Has over two years of experience in the software industry. As vice president and developer, he works on the development of software solutions contracted by a company.",
  },
];

const members = [
  { name: "Anish Kothuru", role: "Developer", image: "/anish.jpg", bio: STUDENT_BIO },
  { name: "Armaan Yadav", role: "Developer", image: "/armaan.jpg", bio: STUDENT_BIO },
  { name: "Gabriel Sholin", role: "Beta Tester", image: "/gabriel.jpg", bio: STUDENT_BIO },
  { name: "Graisen Edwards", role: "Developer", image: "/graisen.jpg", bio: STUDENT_BIO },
  { name: "Joseph Ferrigno", role: "Developer", image: "/joseph.jpg", bio: STUDENT_BIO },
  { name: "Luke Swanson", role: "Developer", image: "/luke.jpg", bio: STUDENT_BIO },
  { name: "Aneesh Lavu", role: "Developer", image: "/aneesh.jpg", bio: STUDENT_BIO },
  { name: "Ishir Aggarwal", role: "Developer", image: "/ishir.jpg", bio: STUDENT_BIO },
  { name: "Khanh Nguyen", role: "Developer", image: "/khanh.jpg", bio: STUDENT_BIO },
  { name: "Prathik Harikrishnan", role: "Developer", image: "/prathik.jpg", bio: STUDENT_BIO },
];

const merriweatherStyle = { fontFamily: "'Merriweather', Georgia, serif" };

/** DeltaMath-style about description — font comes from `lato.className` on the section */
const aboutBlurbDescriptionStyle = {
  margin: 0,
  padding: 0,
  paddingBottom: "10px",
  fontSize: "16px",
  fontWeight: 400,
  letterSpacing: "-0.2px",
  lineHeight: 1.6,
  color: "#292627",
  WebkitFontSmoothing: "antialiased",
};

function TeamMemberCard({ member, onOpen }) {
  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={() => onOpen(member)}
        aria-label={`Open profile for ${member.name}`}
        className="group flex w-fit max-w-full flex-col items-center rounded-lg p-1 text-center transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <div className="mb-3 h-40 w-40 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-muted shadow-sm">
          <Image
            src={member.image}
            alt=""
            width={160}
            height={160}
            className="h-full w-full object-cover"
          />
        </div>
        <h3
          className="mb-1 text-lg font-semibold text-foreground decoration-foreground underline-offset-4 group-hover:underline"
          style={merriweatherStyle}
        >
          {member.name}
        </h3>
        <p className="text-sm text-muted-foreground">{member.role}</p>
      </button>
    </div>
  );
}

export default function AboutUs() {
  const [modalMember, setModalMember] = useState(null);

  useLayoutEffect(() => {
    document.title = "Code4Community | About Us";
  }, []);

  useEffect(() => {
    if (!modalMember) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") setModalMember(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [modalMember]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardTopBar title="Code4Community" showNavLinks={true} />

      {/* Hero */}
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
          <p className="text-base text-white/80">Practical tools you can trust.</p>
        </div>
      </div>

      {/* About blurb — DeltaMath pixel replica sizing/spacing */}
      <div className="bg-background">
        <div
          className={`${lato.className} mx-auto my-[50px] box-border flex w-full max-w-[1200px] flex-row items-center justify-evenly px-[80px] py-[50px] max-[991.98px]:flex-col max-[991.98px]:px-[60px] max-[767.98px]:px-10 max-[375.98px]:px-5`}
        >
          <div className="w-1/2 max-[991.98px]:w-[70%] max-[767.98px]:w-[80%] max-[575.98px]:w-full">
            <div className="relative mr-auto w-full max-w-[482px] overflow-hidden" style={{ aspectRatio: "482 / 316" }}>
              <Image
                src="/c4c%20about%20us.png"
                alt="Code4Community at Broad Run High School — school spirit on the fence"
                fill
                className="object-cover object-center"
                sizes="(max-width: 575px) 100vw, (max-width: 767px) 80vw, (max-width: 991px) 70vw, 50vw"
              />
            </div>
          </div>
          <div className="flex w-1/2 flex-col items-start justify-center px-5 py-5 pl-[50px] max-[991.98px]:w-[70%] max-[991.98px]:px-0 max-[991.98px]:pt-[50px] max-[991.98px]:text-center max-[767.98px]:w-[80%] max-[575.98px]:w-full">
            <div>
              <p className="text-[16px]" style={aboutBlurbDescriptionStyle}>
                Shail Shah created Code4Community in 2023 when he wrote a simple program on calculating
                grades with new assignments. Positive student response prompted him to kick into gear and
                create content for the rest of the school year.
              </p>
              <p className="text-[16px]" style={aboutBlurbDescriptionStyle}>
                Code4Community was started as a club at Broad Run High School to build software that
                teachers and organizations at our school could use. After building hundreds of
                applications and having great success, we decided to expand to helping create services to
                benefit our community, free of charge. Our goal is to help organizations and the community
                through technology by building the tools and software they need to work better. We focus
                on practical, free solutions that make a real difference for teams and users.
              </p>
            </div>
            <div className="w-full">
              <Link
                href="/contact"
                className="mt-5 inline-flex items-center justify-center rounded-[4px] border border-[#303d4e] px-10 py-2 text-[16px] font-[550] tracking-[-1px] text-[#303d4e] no-underline transition-colors hover:bg-[#303d4e] hover:text-white"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Team section */}
      <div className="bg-background border-t border-border py-12 md:py-14 px-6">
        <div className="max-w-3xl mx-auto md:max-w-4xl">
          <h2
            className="text-2xl md:text-3xl font-bold text-foreground text-center mb-8 md:mb-9"
            style={merriweatherStyle}
          >
            Code4Community Team
          </h2>

          {/* Leadership row — 3 across */}
          <div className="mb-5 grid grid-cols-1 gap-x-0.5 gap-y-4 sm:grid-cols-3 sm:gap-x-1 sm:gap-y-3 md:mb-6">
            {leadership.map((member) => (
              <TeamMemberCard key={member.name} member={member} onOpen={setModalMember} />
            ))}
          </div>

          {/* Members — 4 across */}
          <div className="grid grid-cols-2 gap-x-0.5 gap-y-3 md:grid-cols-4 md:gap-x-1 md:gap-y-2.5">
            {members.map((member) => (
              <TeamMemberCard key={member.name} member={member} onOpen={setModalMember} />
            ))}
          </div>
        </div>
      </div>

      {/* Team member modal */}
      {modalMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 z-0 bg-black/50"
            onClick={() => setModalMember(null)}
            aria-label="Close dialog"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-modal-title"
            className="relative z-10 w-full max-w-2xl rounded-lg border border-border bg-background p-6 shadow-xl md:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModalMember(null)}
              className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Close"
            >
              <span className="text-xl leading-none" aria-hidden>
                ×
              </span>
            </button>
            <div className="grid gap-8 pt-2 md:grid-cols-[minmax(0,200px)_1fr] md:items-start md:gap-10">
              <div className="mx-auto flex max-w-[200px] flex-col items-center text-center md:mx-0">
                <div className="mb-4 aspect-square w-full max-w-[180px] overflow-hidden rounded-lg border border-border bg-muted">
                  <Image
                    src={modalMember.image}
                    alt={modalMember.name}
                    width={180}
                    height={180}
                    className="h-full w-full object-cover"
                  />
                </div>
                <h3
                  id="team-modal-title"
                  className="mb-1 text-lg font-semibold text-foreground md:text-xl"
                  style={merriweatherStyle}
                >
                  {modalMember.name}
                </h3>
                <p className="text-sm text-muted-foreground">{modalMember.role}</p>
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                  {modalMember.bio}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
