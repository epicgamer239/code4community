/**
 * Blog posts for newsletter "Read more" links.
 *
 * Add a post here, deploy, then link your email button to:
 *   https://code4community26.web.app/blog/your-slug
 * (or getBlogPostAbsoluteUrl("your-slug") in code)
 *
 * @typedef {{ type: "p", text: string }} BlogParagraph
 * @typedef {{ type: "h2", text: string }} BlogHeading
 * @typedef {{ type: "ul", items: string[] }} BlogList
 * @typedef {{ type: "link", label: string, href: string }} BlogLink
 * @typedef {BlogParagraph | BlogHeading | BlogList | BlogLink} BlogBlock
 *
 * @typedef {{
 *   slug: string;
 *   title: string;
 *   excerpt: string;
 *   date: string;
 *   published: boolean;
 *   blocks: BlogBlock[];
 * }} BlogPost
 */

/** @type {BlogPost[]} */
export const BLOG_POSTS = [
  {
    slug: "weekly-brief-august-23-2026",
    title: "Weekly Brief • August 23, 2026",
    excerpt:
      "This week we created 3 client websites, 2 tools for Broad Run High School, and reached out to 30+ prospective clients with partnership offers.",
    date: "2026-08-23",
    published: true,
    blocks: [
      {
        type: "p",
        text: "This week we created 3 client websites, 2 tools for Broad Run High School, and reached out to 30+ prospective clients with partnership offers.",
      },
      {
        type: "h2",
        text: "Impact year to date",
      },
      {
        type: "ul",
        items: [
          "15 projects active",
          "10 sites delivered",
          "50+ users gained",
          "$600 raised for charity",
        ],
      },
      {
        type: "h2",
        text: "Member spotlight",
      },
      {
        type: "p",
        text: "Ishir Aggarwal worked especially hard recently! His fantastic work in outreach directly led to acquiring multiple clients.",
      },
      {
        type: "h2",
        text: "Upcoming",
      },
      {
        type: "p",
        text: "Our next meeting will be during Seminar on a date TBD. More info soon to come! Feel free to reach out with any questions. Individual assignments will be sent out soon.",
      },
      {
        type: "p",
        text: "If you have any questions, please email us at brhsc4c@gmail.com!",
      },
      {
        type: "link",
        label: "Contact us",
        href: "/contact",
      },
    ],
  },
];

export function getAllPosts() {
  return BLOG_POSTS.filter((post) => post.published).sort((a, b) =>
    b.date.localeCompare(a.date)
  );
}

export function getAllPostSlugs() {
  return BLOG_POSTS.filter((post) => post.published).map((post) => post.slug);
}

export function getPostBySlug(slug) {
  const post = BLOG_POSTS.find((entry) => entry.slug === slug);
  if (!post || !post.published) return null;
  return post;
}

export function formatBlogDate(isoDate) {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function getBlogPostPath(slug) {
  return `/blog/${slug}`;
}

export function getBlogPostAbsoluteUrl(slug) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL || "https://code4community26.web.app";
  return `${base.replace(/\/$/, "")}${getBlogPostPath(slug)}`;
}
