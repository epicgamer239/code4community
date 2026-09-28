import DashboardTopBar from "@/components/layout/DashboardTopBar";
import Footer from "@/components/layout/Footer";
import SiteSkipLink from "@/components/common/SiteSkipLink";
import { SITE_MAIN_ID } from "@/lib/a11y/site";

export function AppPageLayout({
  children,
  title = "Code4Community",
  showNavLinks = true,
  showFooter = true,
  className = "",
}) {
  const classes = ["min-h-screen", "bg-background", "flex", "flex-col", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <SiteSkipLink />
      <DashboardTopBar title={title} showNavLinks={showNavLinks} />
      <main id={SITE_MAIN_ID} className="flex-1 flex flex-col w-full outline-none" tabIndex={-1}>
        {children}
      </main>
      {showFooter ? <Footer /> : null}
    </div>
  );
}

export function CenteredMain({ children, className = "" }) {
  const classes = ["flex-1", "flex", "items-center", "justify-center", "px-6", className]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
}

export function ContainerMain({ children, className = "" }) {
  const classes = ["flex-1", "container", "mx-auto", "px-6", className]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
}
