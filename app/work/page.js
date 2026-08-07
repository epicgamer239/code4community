import Link from "next/link";
import { AppPageLayout } from "@/components/common/AppPageLayout";
import WorkHashScroll from "@/components/work/WorkHashScroll";
import {
  WORK_CATEGORIES,
  getFeaturedWorkProjects,
  getWorkProjectsByCategory,
} from "@/lib/workProjects";

export const metadata = {
  title: "Code4Community | Our Work",
};

export const dynamic = "force-static";

function FeaturedCard({ project }) {
  const href = project.href ?? "#";
  return (
    <Link
      href={href}
      id={project.id}
      className="group flex flex-col border border-border bg-background p-5 md:p-6 scroll-mt-28 hover:border-foreground/30 transition-colors h-full"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h2 className="text-base font-semibold text-foreground tracking-tight leading-snug">
          {project.title}
        </h2>
        <span className="text-[11px] font-medium text-muted-foreground shrink-0 pt-0.5">
          Live
        </span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed flex-1">
        {project.summary || project.description}
      </p>
      <span className="mt-5 text-sm font-medium text-foreground group-hover:underline underline-offset-4">
        Open →
      </span>
    </Link>
  );
}

function CatalogCard({ project }) {
  const href = project.href;
  const Wrapper = href ? Link : "div";
  const wrapperProps = href
    ? { href, id: project.id }
    : { id: project.id };

  return (
    <Wrapper
      {...wrapperProps}
      className={`group flex flex-col border border-border p-4 scroll-mt-28 h-full ${
        href
          ? "bg-background hover:border-foreground/30 transition-colors"
          : "bg-muted/20 opacity-75"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3
          className={`text-[15px] font-medium leading-snug ${
            project.available ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          {project.title}
        </h3>
        <span className="text-[11px] text-muted-foreground shrink-0">
          {project.available ? "Live" : "Soon"}
        </span>
      </div>
      <p className="text-sm text-muted-foreground leading-snug flex-1">
        {project.description}
      </p>
      {href ? (
        <span className="mt-4 text-sm font-medium text-foreground group-hover:underline underline-offset-4">
          Open →
        </span>
      ) : null}
    </Wrapper>
  );
}

export default function WorkPage() {
  const featured = getFeaturedWorkProjects();
  const featuredIds = new Set(featured.map((p) => p.id));

  return (
    <AppPageLayout title="Code4Community">
      <WorkHashScroll />
      <div className="flex-1 border-t border-border px-6 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <header className="mb-10 md:mb-12 max-w-2xl">
            <h1 className="text-3xl md:text-[2.5rem] font-semibold text-foreground tracking-tight">
              Our Work
            </h1>
            <p className="mt-3 text-[15px] text-muted-foreground leading-relaxed">
              Tools we&apos;ve built for Broad Run and local organizations—shipped, maintained, and ready to use.
            </p>
          </header>

          <section className="mb-12 md:mb-14">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Featured
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {featured.map((project) => (
                <FeaturedCard key={project.id} project={project} />
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12">
            {WORK_CATEGORIES.map((category) => {
              const projects = getWorkProjectsByCategory(category.id).filter(
                (p) => !featuredIds.has(p.id)
              );
              if (projects.length === 0) return null;

              return (
                <section key={category.id}>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    {category.label}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {projects.map((project) => (
                      <CatalogCard key={project.id} project={project} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <p className="text-sm text-muted-foreground mt-12 pt-8 border-t border-border">
            Need something built for your organization?{" "}
            <Link
              href="/contact"
              className="text-foreground font-medium underline underline-offset-4 decoration-border hover:decoration-foreground"
            >
              Get in touch
            </Link>
            .
          </p>
        </div>
      </div>
    </AppPageLayout>
  );
}
