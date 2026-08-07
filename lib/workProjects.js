/** Portfolio projects: extend this list as you ship. Set `href` when the tool has a page. */

export const WORK_CATEGORIES = [
  { id: "classroom", label: "Classroom tools" },
  { id: "operations", label: "School operations" },
  { id: "upcoming", label: "Coming later" },
];

export const WORK_PROJECTS = [
  {
    id: "writing-center",
    title: "Writing Center",
    description: "Request writing help, track sessions, and manage tutor assignments.",
    summary: "End-to-end session requests, tutor assignment, and admin tooling for the Writing Center.",
    available: true,
    featured: true,
    category: "operations",
    href: "/writing-center",
  },
  {
    id: "math-lab",
    title: "BRHS Math Lab",
    description: "Tutoring requests, sessions, and history for the Math Lab.",
    summary: "Scheduling and session history so students can get math help without the paperwork friction.",
    available: true,
    featured: true,
    category: "operations",
    href: "/mathlab",
  },
  {
    id: "club-hub",
    title: "Broad Run Club Hub",
    description: "Club directory, engagement rankings, and shared calendar.",
    summary: "A single place for students to discover clubs, see activity, and stay on the calendar.",
    available: true,
    featured: true,
    category: "operations",
    href: "/club-hub",
  },
  {
    id: "grade-calculator",
    title: "Grade Calculator",
    description: "Calculate course grades from assignments and weights.",
    available: true,
    category: "classroom",
    href: "/grade-calculator",
  },
  {
    id: "yearbook-formatting",
    title: "Yearbook Formatting",
    description: "Format student names for yearbook captions.",
    available: true,
    category: "classroom",
    href: "/yearbook-formatting",
  },
  {
    id: "seating-chart",
    title: "Seating Chart",
    description: "Create seating charts and assign students to tables.",
    available: true,
    category: "classroom",
    href: "/seating-chart",
  },
  {
    id: "student-groups",
    title: "Student Groups",
    description: "Build balanced groups with roster constraints and export.",
    available: true,
    category: "classroom",
    href: "/student-groups",
  },
  {
    id: "office-hours-scheduler",
    title: "Office Hour Scheduler",
    description: "Book office hours; teachers set capacity and available times.",
    available: true,
    category: "operations",
    href: "/office-hours/scheduler",
  },
  {
    id: "library-pass",
    title: "Library Pass",
    description: "Sign up for a library pass by block on A or B days.",
    available: true,
    category: "operations",
    href: "/library-pass",
  },
  {
    id: "coming-soon-1",
    title: "More tools in progress",
    description: "Additional projects are in design and development.",
    available: false,
    category: "upcoming",
  },
];

export function getFeaturedWorkProjects() {
  return WORK_PROJECTS.filter((p) => p.featured && p.available);
}

export function getWorkProjectsByCategory(categoryId) {
  return WORK_PROJECTS.filter((p) => p.category === categoryId);
}
