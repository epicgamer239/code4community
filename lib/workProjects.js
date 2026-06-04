/** Portfolio tiles: extend this list as you ship new projects. Set `href` when the tool has a page. */
export const WORK_PROJECTS = [
  {
    id: "grade-calculator",
    title: "Grade Calculator",
    description: "Calculate your grades",
    available: true,
    href: "/grade-calculator",
  },
  {
    id: "yearbook-formatting",
    title: "Yearbook Formatting",
    description: "Format student names for yearbook captions",
    available: true,
    href: "/yearbook-formatting",
  },
  {
    id: "seating-chart",
    title: "Seating Chart",
    description: "Create seating charts and assign students to tables",
    available: true,
    href: "/seating-chart",
  },
  {
    id: "student-groups",
    title: "Student Groups",
    description: "Create balanced groups with roster, constraints, and export",
    available: true,
    href: "/student-groups",
  },
  {
    id: "math-lab",
    title: "BRHS Math Lab",
    description: "Math Lab scheduling system: tutoring requests, sessions, and history",
    available: true,
    href: "/mathlab",
  },
  {
    id: "office-hours-scheduler",
    title: "Office Hour Scheduler",
    description: "Book office hours with teachers; teachers set capacity and available times",
    available: true,
    href: "/office-hours/scheduler",
  },
  {
    id: "club-hub",
    title: "Broad Run Club Hub",
    description: "Club directory, engagement rankings, and shared calendar",
    available: true,
    href: "/club-hub",
  },
  {
    id: "writing-center",
    title: "Writing Center",
    description: "Request writing help, track sessions, and manage tutor assignments",
    available: true,
    href: "/writing-center",
  },
  {
    id: "library-pass",
    title: "Library Pass",
    description: "Sign up for a library pass by block on A or B days",
    available: true,
    href: "/library-pass",
  },
  ...[1].map((n) => ({
    id: `coming-soon-${n}`,
    title: "Coming Soon",
    description: "More features coming soon",
    available: false,
  })),
];

export function getFeaturedWorkProjects() {
  return WORK_PROJECTS.slice(0, 3);
}
