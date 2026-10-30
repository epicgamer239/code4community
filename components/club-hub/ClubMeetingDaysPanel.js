"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/utils/AuthContext";
import ClubHubLiveMessage from "@/components/club-hub/ClubHubLiveMessage";
import {
  canPickClubForGoldMeetingDay,
  canPickClubForMaroonMeetingDay,
} from "@/lib/club-hub/meetingDayBoardAccess";
import {
  fetchMembershipsForUser,
  updateMembershipSeminarDays,
} from "@/lib/club-hub/clubMemberships";
import { getEffectiveMeetingDayForSlug } from "@/lib/club-hub/clubDirectorySections";
import { loadMeetingDayOverrides } from "@/lib/club-hub/clubMeetingDays";
import {
  meetingChoicesFromMemberships,
  resolveSeminarDays,
} from "@/lib/club-hub/seminarMembershipLimit";
import { notifyMeetingChoicesSheetSync } from "@/lib/club-hub/notifyMeetingChoicesSheetSync";
import { clubHubButtonFocusClass } from "@/lib/club-hub/a11y";

export default function ClubMeetingDaysPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [memberships, setMemberships] = useState([]);

  useEffect(() => {
    const uid = user?.uid;
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      if (!uid) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const [rows] = await Promise.all([
          fetchMembershipsForUser(uid),
          loadMeetingDayOverrides(),
        ]);
        if (cancelled) return;
        setMemberships(rows);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load your clubs.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const choices = useMemo(() => meetingChoicesFromMemberships(memberships), [memberships]);

  const goldMembership = useMemo(
    () => memberships.find((m) => m.clubSlug === choices.goldClubSlug) || null,
    [memberships, choices.goldClubSlug],
  );
  const maroonMembership = useMemo(
    () => memberships.find((m) => m.clubSlug === choices.maroonClubSlug) || null,
    [memberships, choices.maroonClubSlug],
  );

  const dualDayMemberships = useMemo(
    () =>
      memberships.filter((m) => {
        if (getEffectiveMeetingDayForSlug(m.clubSlug) !== "both") return false;
        return canPickClubForGoldMeetingDay(m) || canPickClubForMaroonMeetingDay(m);
      }),
    [memberships],
  );

  const hasSeminarClub = Boolean(goldMembership || maroonMembership);
  const hasAnyMembership = memberships.length > 0;
  const joinedOnlyGeneral =
    hasAnyMembership &&
    !memberships.some(
      (m) => canPickClubForGoldMeetingDay(m) || canPickClubForMaroonMeetingDay(m),
    );

  /** @param {string} clubSlug @param {("gold" | "maroon")[]} seminarDays */
  const handleSeminarDaysChange = async (clubSlug, seminarDays) => {
    if (!user?.uid || savingSlug) return;
    setSavingSlug(clubSlug);
    setError("");
    setMessage("");
    try {
      await updateMembershipSeminarDays({
        clubSlug,
        userId: user.uid,
        seminarDays,
      });
      const rows = await fetchMembershipsForUser(user.uid);
      setMemberships(rows);
      await notifyMeetingChoicesSheetSync(user);
      setMessage("Seminar days updated.");
    } catch (err) {
      setError(err.message || "Could not update seminar days.");
    } finally {
      setSavingSlug("");
    }
  };

  if (!user) {
    return (
      <p className="text-sm text-neutral-700">
        <Link href="/login?redirectTo=%2Fclub-hub%2Fmeeting-days" className="text-[#5c1417] underline">
          Log in
        </Link>{" "}
        to see your Gold and Maroon seminar clubs.
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-neutral-700">Loading…</p>;
  }

  return (
    <div className="space-y-5">
      <ClubHubLiveMessage message={error} variant="alert" />
      <ClubHubLiveMessage message={message} />

      {!hasAnyMembership ? (
        <p className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-sm text-neutral-800">
          You have not joined any clubs yet.{" "}
          <Link href="/club-hub/directory" className="font-semibold text-[#5c1417] hover:underline">
            Browse the directory
          </Link>{" "}
          and join one Gold day club and one Maroon day club (General clubs are unlimited).
        </p>
      ) : null}

      {joinedOnlyGeneral ? (
        <p className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-sm text-neutral-800">
          Your joined clubs are General only, so none meet during seminar. Join a Gold day club and a
          Maroon day club from the{" "}
          <Link href="/club-hub/directory" className="font-semibold text-[#5c1417] hover:underline">
            directory
          </Link>
          .
        </p>
      ) : null}

      {hasSeminarClub || hasAnyMembership ? (
        <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
          <SeminarClubCard
            title="Gold day club"
            membership={goldMembership}
            emptyText="You have not joined a Gold day club."
          />
          <SeminarClubCard
            title="Maroon day club"
            membership={maroonMembership}
            emptyText="You have not joined a Maroon day club."
          />
        </div>
      ) : null}

      {dualDayMemberships.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-900">Clubs that meet both days</h2>
          <p className="text-sm text-neutral-700">
            Choose whether you attend on Gold days only, Maroon days only, or both.
          </p>
          <ul className="space-y-3">
            {dualDayMemberships.map((membership) => {
              const days = resolveSeminarDays(membership);
              const choice =
                days.includes("gold") && days.includes("maroon")
                  ? "both"
                  : days.includes("gold")
                    ? "gold"
                    : "maroon";
              const busy = savingSlug === membership.clubSlug;
              return (
                <li
                  key={membership.clubSlug}
                  className="rounded-lg border border-neutral-200 bg-white px-4 py-3"
                >
                  <Link
                    href={`/club-hub/directory/${membership.clubSlug}`}
                    className="font-medium text-[#5c1417] hover:underline"
                  >
                    {membership.clubName || membership.clubSlug}
                  </Link>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      { value: "gold", label: "Gold only", days: /** @type {("gold"|"maroon")[]} */ (["gold"]) },
                      {
                        value: "maroon",
                        label: "Maroon only",
                        days: /** @type {("gold"|"maroon")[]} */ (["maroon"]),
                      },
                      {
                        value: "both",
                        label: "Both days",
                        days: /** @type {("gold"|"maroon")[]} */ (["gold", "maroon"]),
                      },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        disabled={busy || choice === option.value}
                        onClick={() => handleSeminarDaysChange(membership.clubSlug, option.days)}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${clubHubButtonFocusClass} ${
                          choice === option.value
                            ? "bg-[#5c1417] text-white"
                            : "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
                        }`}
                      >
                        {busy && choice !== option.value ? "Saving…" : option.label}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/**
 * @param {{
 *   title: string,
 *   membership: { clubSlug: string, clubName?: string } | null,
 *   emptyText: string,
 * }} props
 */
function SeminarClubCard({ title, membership, emptyText }) {
  return (
    <div className="min-w-0 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
      <p className="text-sm font-semibold text-neutral-900">{title}</p>
      {membership ? (
        <Link
          href={`/club-hub/directory/${membership.clubSlug}`}
          className="mt-1 block text-base font-medium text-[#5c1417] hover:underline"
        >
          {membership.clubName || membership.clubSlug}
        </Link>
      ) : (
        <p className="mt-1 text-sm text-neutral-700">{emptyText}</p>
      )}
    </div>
  );
}
