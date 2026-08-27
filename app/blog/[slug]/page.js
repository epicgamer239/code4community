import Link from "next/link";
import { notFound } from "next/navigation";
import { AppPageLayout } from "@/components/common/AppPageLayout";
import BlogPostBody from "@/components/blog/BlogPostBody";
import {
  formatBlogDate,
  getAllPostSlugs,
  getPostBySlug,
} from "@/lib/blog/posts";

export function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Code4Community | Blog" };

  return {
    title: `${post.title} | Code4Community`,
    description: post.excerpt,
  };
}

export const dynamic = "force-static";

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <AppPageLayout>
      <div className="max-w-4xl mx-auto px-6 py-8 md:py-12">
        <Link
          href="/blog"
          className="inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          ← All posts
        </Link>

        <article>
          <header className="mb-10">
            <time
              dateTime={post.date}
              className="text-sm text-muted-foreground"
            >
              {formatBlogDate(post.date)}
            </time>
            <h1 className="mt-2 text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              {post.title}
            </h1>
            {post.excerpt ? (
              <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
                {post.excerpt}
              </p>
            ) : null}
          </header>

          <BlogPostBody blocks={post.blocks} />
        </article>
      </div>
    </AppPageLayout>
  );
}
