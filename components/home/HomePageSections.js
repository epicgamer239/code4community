import Image from "next/image";
import Link from "next/link";
import WorkProjectTile from "@/components/WorkProjectTile";
import { getFeaturedWorkProjects } from "@/lib/workProjects";

const partners = [
  { name: "S2Alliance", logo: "/s2alliance_inc_logo.jpeg", alt: "S2Alliance" },
  { name: "LCPS", logo: "/lcps.png", alt: "Loudoun County Public Schools" },
  { name: "Beaverbots", logo: "/beaverbots.png", alt: "Beaverbots Team Robots" },
];

/** Server-rendered home sections (not in the client Home bundle). */
export default function HomePageSections() {
  return (
    <>
      <section className="border-t border-border bg-background py-16 md:py-20 px-6">
        <p className="text-center text-sm font-medium uppercase tracking-wider text-muted-foreground mb-10">
          Some of our trusted partners
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

      <section className="border-t border-border bg-muted/20 py-16 md:py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Many Community Organizations Need Digital Tools
          </h2>
          <p className="text-lg text-muted-foreground mb-6">
            But building software is often expensive or complicated.
          </p>
          <p className="text-foreground leading-relaxed mb-6">
            Nonprofits and small organizations often need simple tools to run their programs effectively with things like event trackers, volunteer systems, or internal dashboards.
          </p>
          <p className="text-foreground leading-relaxed mb-6">
            Unfortunately, hiring developers or agencies can cost thousands of dollars, making these tools inaccessible to many community groups.
          </p>
          <p className="font-semibold text-foreground">
            Code4Community was created to help solve this challenge.
          </p>
        </div>
      </section>

      <section className="border-t border-border bg-background py-16 md:py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-3">
            What We Do
          </h2>
          <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Our student team designs and builds digital tools for local organizations at low cost.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-xl border border-border bg-muted/30 p-6">
              <h3 className="font-semibold text-foreground mb-2">Custom Websites</h3>
              <p className="text-sm text-muted-foreground">
                We build simple, clean websites for organizations that need an online presence at low cost.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-6">
              <h3 className="font-semibold text-foreground mb-2">Productivity Tools</h3>
              <p className="text-sm text-muted-foreground">
                Internal tools to help manage events, volunteers, and programs.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-6">
              <h3 className="font-semibold text-foreground mb-2">Data Dashboards</h3>
              <p className="text-sm text-muted-foreground">
                Track donations, participation, and organization data in one place.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-6">
              <h3 className="font-semibold text-foreground mb-2">Custom Solutions</h3>
              <p className="text-sm text-muted-foreground">
                If your organization has a unique problem, we work with you to design a custom solution.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-background py-16 md:py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
            Some of Our Work
          </h2>
          <p className="text-center text-sm text-muted-foreground mb-8 max-w-xl mx-auto">
            A few student-built tools we have shipped for teachers and the school community—grade tools, yearbook helpers, seating charts, and more to come.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
            {getFeaturedWorkProjects().map((p) => (
              <WorkProjectTile
                key={p.id}
                id={p.id}
                title={p.title}
                description={p.description}
                available={p.available}
                linkHref={p.href ?? `/work#${p.id}`}
              />
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Link
              href="/work"
              className="inline-flex items-center justify-center rounded-[4px] border border-[#303d4e] px-10 py-2 text-[16px] font-[550] tracking-[-1px] text-[#303d4e] no-underline transition-colors hover:bg-[#303d4e] hover:text-white"
            >
              See all work
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
