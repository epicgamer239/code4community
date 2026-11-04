"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import {
  CategoryBadge,
  Notice,
  StatusBadge,
  cardClass,
  formatDate,
} from "@/components/school-forum/ui";
import { forumFetch } from "@/lib/school-forum/forumClient";

const STATE_STYLES = {
  pending: "bg-slate-100 text-slate-800",
  approved: "bg-green-50 text-green-800",
  rejected: "bg-red-50 text-red-800",
  merged: "bg-blue-50 text-blue-800",
  safety: "bg-amber-50 text-amber-900",
};

/** The student's own posts and what happened to each one. Only they see this. */
export default function MyPosts({ user, refreshKey }) {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    forumFetch(user, "/my-concerns")
      .then((data) => {
        if (!cancelled) setPosts(data.concerns);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [user, refreshKey]);

  if (error) return <Notice kind="error">{error}</Notice>;
  if (!posts) return <LoadingSpinner text="Loading your posts" />;
  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-400 bg-slate-50 p-8 text-center text-slate-700">
        You haven&apos;t posted any concerns yet.
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-slate-700">
        Only you can see this list. Other students see approved posts on the board without your name.
      </p>
      <ul className="space-y-4">
        {posts.map((post) => (
          <li key={post.id}>
            <article aria-labelledby={`my-${post.id}`} className={cardClass}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATE_STYLES[post.state] ?? ""}`}>
                  {post.stateLabel}
                </span>
                <StatusBadge status={post.publicStatus} />
                <CategoryBadge category={post.category} />
              </div>
              <h3 id={`my-${post.id}`} className="mt-3 text-lg font-bold text-foreground">
                {post.title}
              </h3>
              <p className="mt-1 whitespace-pre-line text-slate-800">{post.body}</p>
              <p className="mt-2 text-sm text-slate-700">
                Sent {formatDate(post.submittedOn)}
                {post.editedByModerator ? " · Edited by a moderator for clarity" : ""}
              </p>
              {post.rejectionReason ? (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                  <p className="font-semibold">Why this wasn&apos;t approved</p>
                  <p className="mt-1">{post.rejectionReason}</p>
                </div>
              ) : null}
              {post.safetyMessage ? (
                <div className="mt-3 rounded-lg border-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  <p className="font-semibold">Please talk to someone</p>
                  <p className="mt-1">{post.safetyMessage}</p>
                </div>
              ) : null}
              {post.state === "merged" ? (
                <p className="mt-3 text-sm text-slate-800">
                  Another student posted the same concern, so the two were combined. Votes for both now count together.
                </p>
              ) : null}
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
