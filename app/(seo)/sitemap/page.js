import Link from "next/link";
import DashboardTopBar from "@/components/layout/DashboardTopBar";

export default function SitemapPage() {
  const publicPages = [
    { path: "/", title: "Home", description: "Main landing page" },
    { path: "/about", title: "About Us", description: "Learn about Code4Community" },
    { path: "/services", title: "Services", description: "Our available services and tools" },
    { path: "/work", title: "Our Work", description: "Student-built tools and projects" },
    { path: "/grade-calculator", title: "Grade Calculator", description: "Calculate your grades" },
    { path: "/yearbook-formatting", title: "Yearbook Formatting", description: "Format student names for yearbook captions" },
    { path: "/seating-chart", title: "Seating Chart", description: "Classroom seating charts and assignments" },
    { path: "/student-groups", title: "Student Groups", description: "Balanced student groups with roster and export" },
    { path: "/mathlab", title: "Math Lab", description: "Tutoring requests and live sessions" },
    { path: "/mathlab/history", title: "Math Lab History", description: "Completed tutoring sessions" },
    { path: "/mathlab/session-tracking", title: "Math Lab Session Tracking", description: "Admin session overview" },
    { path: "/club-hub", title: "Broad Run Club Hub", description: "Engagement rankings and calendar" },
    {
      path: "/club-hub/directory",
      title: "Broad Run Club Directory",
      description: "Full club list with sponsor contacts",
    },
    { path: "/contact", title: "Contact", description: "Get in touch with us" },
    { path: "/privacy", title: "Privacy Policy", description: "Privacy policy" },
    { path: "/terms", title: "Terms of Service", description: "Terms of service" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardTopBar />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Site Map</h1>
          <p className="text-gray-600 mb-8">
            Navigate through all available pages on Code4Community
          </p>

          {/* Public Pages */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Public Pages</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {publicPages.map((page) => (
                <Link
                  key={page.path}
                  href={page.path}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <h3 className="font-medium text-gray-900">{page.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{page.description}</p>
                  <span className="text-xs text-blue-600 mt-2 inline-block">{page.path}</span>
                </Link>
              ))}
            </div>
          </section>


          {/* SEO Information */}
          <section className="mt-12 p-6 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">SEO Information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">XML Sitemap</h3>
                <p className="text-sm text-gray-600 mb-2">
                  For search engines and crawlers
                </p>
                <Link
                  href="/sitemap.xml"
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  /sitemap.xml
                </Link>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Robots.txt</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Instructions for web crawlers
                </p>
                <Link
                  href="/robots.txt"
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  /robots.txt
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
