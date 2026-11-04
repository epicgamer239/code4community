"use client";

import { useId, useMemo, useState } from "react";
import {
  CategoryBadge,
  LiveMessage,
  Notice,
  StatusBadge,
  btnPrimary,
  btnSecondary,
  cardClass,
  formatDate,
  inputClass,
  labelClass,
} from "@/components/school-forum/ui";
import {
  CONCERN_CATEGORY_LABELS,
  PUBLIC_STATUS_LABELS,
} from "@/lib/school-forum/constants";
import { forumFetch } from "@/lib/school-forum/forumClient";

function CycleBanner({ cycle, nextCycle, votesLeft, maxVotes, canVote }) {
  if (cycle) {
    return (
      <section aria-labelledby="cycle-banner-heading" className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <h2 id="cycle-banner-heading" className="text-lg font-bold text-blue-950">
          Voting is open: {cycle.label}
        </h2>
        <p className="mt-1 text-blue-950">
          Voting closes {formatDate(cycle.endsAt, { withTime: true })}.{" "}
          {canVote ? (
            <strong>
              You have {votesLeft} of {maxVotes} votes left.
            </strong>
          ) : null}
        </p>
        <p className="mt-1 text-sm text-blue-900">
          Give up to {maxVotes} concerns one vote each. You can change your votes until voting closes.
          The top concerns are presented to school administrators.
        </p>
      </section>
    );
  }
  return (
    <section aria-labelledby="cycle-banner-heading" className="rounded-2xl border border-border bg-slate-50 p-5">
      <h2 id="cycle-banner-heading" className="text-lg font-bold text-foreground">
        Voting is closed right now
      </h2>
      <p className="mt-1 text-slate-700">
        {nextCycle
          ? `The next voting cycle opens ${formatDate(nextCycle.startsAt, { withTime: true })}.`
          : "The SCA will open the next voting cycle soon. You can still post concerns."}
      </p>
    </section>
  );
}

function LatestResults({ latestResults }) {
  if (!latestResults?.results?.length) return null;
  return (
    <section aria-labelledby="latest-results-heading" className={cardClass}>
      <h2 id="latest-results-heading" className="text-lg font-bold text-foreground">
        Top concerns from {latestResults.cycle.label}
      </h2>
      <p className="mt-1 text-sm text-slate-700">
        Voting closed {formatDate(latestResults.cycle.closedAt)}. These are being taken to school administrators.
      </p>
      <ol className="mt-3 space-y-1">
        {latestResults.results.map((r) => (
          <li key={r.concernId} className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="font-semibold text-foreground">#{r.rank}</span>
            <span className="text-foreground">{r.title}</span>
            <span className="text-slate-700">
              ({r.votes} {r.votes === 1 ? "vote" : "votes"}
              {r.addedByFlag ? ", added by SCA as important" : ""})
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ConcernCard({ concern, votingOpen, canVote, votesLeft, busy, onVote }) {
  const headingId = `concern-${concern.id}-title`;
  const voteDisabled = busy || (!concern.myVote && votesLeft <= 0);
  return (
    <article aria-labelledby={headingId} className={cardClass}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={concern.publicStatus} />
        <CategoryBadge category={concern.category} />
      </div>
      <h3 id={headingId} className="mt-3 text-lg font-bold text-foreground">
        {concern.title}
      </h3>
      <p className="mt-2 whitespace-pre-line text-slate-800">{concern.body}</p>
      <p className="mt-3 text-sm text-slate-700">
        Posted {formatDate(concern.postedOn)}
        {concern.mergedCount > 0
          ? ` · Combined with ${concern.mergedCount} similar ${concern.mergedCount === 1 ? "post" : "posts"}`
          : ""}
      </p>

      {concern.responses.length > 0 ? (
        <section aria-label={`School responses to ${concern.title}`} className="mt-4 space-y-2">
          {concern.responses.map((r, i) => (
            <div key={i} className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-sm font-semibold text-blue-950">
                School response · {PUBLIC_STATUS_LABELS[r.status] ?? r.status} · {formatDate(r.postedOn)}
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-blue-950">{r.text}</p>
            </div>
          ))}
        </section>
      ) : null}

      {votingOpen && concern.publicStatus === "open" ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <p className="text-sm font-semibold text-foreground">
            {concern.votes} {concern.votes === 1 ? "vote" : "votes"} this cycle
          </p>
          {canVote ? (
            <button
              type="button"
              aria-pressed={concern.myVote}
              aria-label={concern.myVote ? `Remove your vote for ${concern.title}` : `Vote for ${concern.title}`}
              disabled={voteDisabled}
              onClick={() => onVote(concern, concern.myVote ? "remove" : "add")}
              className={concern.myVote ? btnSecondary : btnPrimary}
            >
              {concern.myVote ? "✓ Voted · Remove vote" : "Vote"}
            </button>
          ) : null}
          {canVote && !concern.myVote && votesLeft <= 0 ? (
            <p className="text-sm text-slate-700">Remove a vote elsewhere to vote for this one.</p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export default function ConcernBoard({ overview, reload, user }) {
  const filterId = useId();
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canVote = Boolean(overview.capabilities.vote);
  const votingOpen = Boolean(overview.cycle);
  const votesLeft = overview.maxVotes - overview.myVotes.length;

  const shown = useMemo(
    () =>
      overview.concerns.filter(
        (c) => (status === "all" || c.publicStatus === status) && (category === "all" || c.category === category),
      ),
    [overview.concerns, status, category],
  );

  const onVote = async (concern, action) => {
    setBusyId(concern.id);
    setError("");
    try {
      const res = await forumFetch(user, "/votes", { method: "POST", body: { concernId: concern.id, action } });
      await reload();
      setMessage(
        `${action === "add" ? "Vote added for" : "Vote removed from"} "${concern.title}". You have ${res.votesLeft} of ${overview.maxVotes} votes left.`,
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <CycleBanner
        cycle={overview.cycle}
        nextCycle={overview.nextCycle}
        votesLeft={votesLeft}
        maxVotes={overview.maxVotes}
        canVote={canVote}
      />
      <LiveMessage message={message} />
      <Notice kind="error" focus>
        {error}
      </Notice>
      <LatestResults latestResults={overview.latestResults} />

      <section aria-labelledby="board-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="board-heading" className="text-2xl font-bold text-foreground">
            Concerns board
          </h2>
          <div className="flex flex-wrap gap-3">
            <div>
              <label htmlFor={`${filterId}-status`} className={labelClass}>
                Status
              </label>
              <select
                id={`${filterId}-status`}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={`${inputClass} mt-1 w-44`}
              >
                <option value="all">All statuses</option>
                {Object.entries(PUBLIC_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${filterId}-category`} className={labelClass}>
                Who can fix it
              </label>
              <select
                id={`${filterId}-category`}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`${inputClass} mt-1 w-52`}
              >
                <option value="all">All categories</option>
                {Object.entries(CONCERN_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-700" aria-live="polite">
          Showing {shown.length} of {overview.concerns.length} concerns.
        </p>

        {shown.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-400 bg-slate-50 p-8 text-center text-slate-700">
            No concerns match these filters yet.
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {shown.map((concern) => (
              <li key={concern.id}>
                <ConcernCard
                  concern={concern}
                  votingOpen={votingOpen}
                  canVote={canVote}
                  votesLeft={votesLeft}
                  busy={busyId === concern.id}
                  onVote={onVote}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
