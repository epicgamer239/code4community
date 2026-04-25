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
    id: "study-timer",
    title: "Study Timer",
    description: "Stopwatch, timer, and Pomodoro timer for studying",
    available: true,
    href: "/study-timer",
  },
  ...[2, 3, 4].map((n) => ({
    id: `coming-soon-${n}`,
    title: "Coming Soon",
    description: "More features coming soon",
    available: false,
  })),
];

export function getFeaturedWorkProjects() {
  return WORK_PROJECTS.slice(0, 3);
}
