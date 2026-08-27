import Link from "next/link";
import { AppPageLayout } from "@/components/common/AppPageLayout";
import { formatBlogDate, getAllPosts } from "@/lib/blog/posts";

export const metadata = {
  title: "Code4Community | Blog",
  description:
    "Updates, launches, and news from Code4Community — a student-led engineering club building free digital tools.",
};

export const dynamic = "force-static";

function PostCard({ post }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col border border-border bg-background p-5 md:p-6 hover:border-foreground/30 transition-colors h-full"
    >
      <time
        dateTime={post.date}
        className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide"
      >
        {formatBlogDate(post.date)}
      </time>
      <h2 className="mt-2 text-lg font-semibold text-foreground tracking-tight leading-snug">
        {post.title}
      </h2>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed flex-1">
        {post.excerpt}
      </p>
      <span className="mt-5 text-sm font-medium text-foreground group-hover:underline underline-offset-4">
        Read more →
      </span>
    </Link>
  );
}

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <AppPageLayout>
      <div className="flex-1 border-t border-border px-6 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <header className="mb-10 md:mb-12">
            <h1 className="text-3xl md:text-[2.5rem] font-semibold text-foreground tracking-tight">
              Blog
            </h1>
            <p className="mt-3 text-[15px] text-muted-foreground leading-relaxed max-w-2xl">
              Longer updates from our newsletters — project launches, club news,
              and how our student engineers are helping nonprofits.
            </p>
          </header>

          {posts.length === 0 ? (
            <p className="text-muted-foreground text-[15px]">
              No posts yet. Check back soon.
            </p>
          ) : (
            <div className="grid gap-4 md:gap-5">
              {posts.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppPageLayout>
  );
}
