import Image from "next/image";
import Link from "next/link";
import { Lato } from "next/font/google";
import { AppPageLayout } from "@/components/common/AppPageLayout";
import AboutTeamSection from "@/components/about/AboutTeamSection";
import { ABOUT_HERO_IMAGE, leadership, activeMembers } from "@/lib/aboutTeam";

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const aboutBlurbDescriptionStyle = {
  padding: 0,
  paddingBottom: "10px",
  fontSize: "16px",
  fontWeight: 400,
  letterSpacing: "-0.2px",
  lineHeight: 1.6,
  color: "#292627",
  WebkitFontSmoothing: "antialiased",
};

const aboutBlurbFirstParaStyle = {
  ...aboutBlurbDescriptionStyle,
  marginTop: 0,
  marginBottom: "1.6em",
};

export default function AboutPageContent() {
  return (
    <AppPageLayout>
      <div className="relative text-white py-20 md:py-28 px-6 md:px-12 lg:px-16 overflow-hidden -mt-6">
        <div className="absolute inset-0">
          <Image
            src={ABOUT_HERO_IMAGE}
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
              <span
                className="absolute bottom-1 left-0 w-full h-1 bg-amber-400 rounded-full"
                aria-hidden
              />
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-2">
            Code4Community comes straight from the source.
          </p>
          <p className="text-base text-white/80">Practical tools you can trust.</p>
        </div>
      </div>

      <div className="bg-background">
        <div
          className={`${lato.className} mx-auto my-[50px] box-border flex w-full max-w-[1200px] flex-row items-center justify-evenly px-[80px] py-[50px] max-[991.98px]:flex-col max-[991.98px]:px-[60px] max-[767.98px]:px-10 max-[375.98px]:px-5`}
        >
          <div className="w-1/2 max-[991.98px]:w-[70%] max-[767.98px]:w-[80%] max-[575.98px]:w-full">
            <div
              className="relative mr-auto w-full max-w-[482px] overflow-hidden"
              style={{ aspectRatio: "482 / 316" }}
            >
              <Image
                src="/brand/c4c-about-us.png"
                alt="Code4Community at Broad Run High School, school spirit on the fence"
                fill
                className="object-cover object-center"
                sizes="(max-width: 575px) 100vw, (max-width: 767px) 80vw, (max-width: 991px) 70vw, 50vw"
              />
            </div>
          </div>
          <div className="flex w-1/2 flex-col items-start justify-center px-5 py-5 pl-[50px] max-[991.98px]:w-[70%] max-[991.98px]:px-0 max-[991.98px]:pt-[50px] max-[991.98px]:text-center max-[767.98px]:w-[80%] max-[575.98px]:w-full">
            <div>
              <p className="text-[#212121] dark:text-neutral-200" style={aboutBlurbFirstParaStyle}>
                Shail Shah created Code4Community in 2023 when he wrote a simple program on calculating
                grades with new assignments. Positive student response prompted him to kick into gear and
                create content for the rest of the school year.
              </p>
              <p
                className="text-[#212121] dark:text-neutral-200"
                style={{ ...aboutBlurbDescriptionStyle, margin: 0 }}
              >
                Code4Community was started as a club at Broad Run High School to build software that
                teachers and organizations at our school could use. After building hundreds of
                applications and having great success, we decided to expand to helping create services to
                benefit our community at low cost. Our goal is to help organizations and the community
                through technology by building the tools and software they need to work better. We focus
                on practical, low-cost solutions that make a real difference for teams and users.
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

      <AboutTeamSection leadership={leadership} members={activeMembers} />
    </AppPageLayout>
  );
}
