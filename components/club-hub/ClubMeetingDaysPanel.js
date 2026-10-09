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
  fetchMeetingChoices,
  getMeetingChoiceSwitchError,
  saveMeetingChoices,
} from "@/lib/club-hub/clubMeetingChoices";
import { notifyMeetingChoicesSheetSync } from "@/lib/club-hub/notifyMeetingChoicesSheetSync";
import { fetchMembershipsForUser } from "@/lib/club-hub/clubMemberships";
import { clubHubButtonFocusClass } from "@/lib/club-hub/a11y";
import { CLUB_HUB_CARD, CLUB_HUB_MAROON } from "@/lib/club-hub/theme";

export default function ClubMeetingDaysPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [memberships, setMemberships] = useState([]);
  const [goldClubSlug, setGoldClubSlug] = useState("");
  const [maroonClubSlug, setMaroonClubSlug] = useState("");
  const [savedChoices, setSavedChoices] = useState({
    goldClubSlug: "",
    maroonClubSlug: "",
    choicesUpdatedAt: null,
  });

  const switchCooldownError = useMemo(
    () =>
      getMeetingChoiceSwitchError(
        savedChoices,
        { goldClubSlug, maroonClubSlug },
        savedChoices.choicesUpdatedAt,
      ),
    [savedChoices, goldClubSlug, maroonClubSlug],
  );

  const joinedSlugs = useMemo(
    () => new Set(memberships.map((m) => m.clubSlug)),
    [memberships],
  );

  const goldOptions = useMemo(
    () => memberships.filter((m) => canPickClubForGoldMeetingDay(m)),
    [memberships],
  );

  const maroonOptions = useMemo(
    () => memberships.filter((m) => canPickClubForMaroonMeetingDay(m)),
    [memberships],
  );

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
        const [rows, choices] = await Promise.all([
          fetchMembershipsForUser(uid),
          fetchMeetingChoices(uid),
        ]);
        if (cancelled) return;
        setMemberships(rows);
        const goldOpts = rows.filter((m) => canPickClubForGoldMeetingDay(m));
        const maroonOpts = rows.filter((m) => canPickClubForMaroonMeetingDay(m));
        const nextGold = goldOpts.some((m) => m.clubSlug === choices.goldClubSlug)
          ? choices.goldClubSlug
          : "";
        const nextMaroon = maroonOpts.some((m) => m.clubSlug === choices.maroonClubSlug)
          ? choices.maroonClubSlug
          : "";
        setGoldClubSlug(nextGold);
        setMaroonClubSlug(nextMaroon);
        setSavedChoices({
          goldClubSlug: nextGold,
          maroonClubSlug: nextMaroon,
          choicesUpdatedAt: choices.choicesUpdatedAt,
        });
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

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user?.uid || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await saveMeetingChoices({
        userId: user.uid,
        goldClubSlug,
        maroonClubSlug,
        joinedSlugs,
        memberships,
      });
      const refreshed = await fetchMeetingChoices(user.uid);
      setSavedChoices({
        goldClubSlug: refreshed.goldClubSlug,
        maroonClubSlug: refreshed.maroonClubSlug,
        choicesUpdatedAt: refreshed.choicesUpdatedAt,
      });
      await notifyMeetingChoicesSheetSync(user);
      setMessage("Meeting day clubs saved.");
    } catch (err) {
      setError(err.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <p className="text-sm text-neutral-700">
        <Link href="/login?redirectTo=%2Fclub-hub%2Fmeeting-days" className="text-[#5c1417] underline">
          Log in
        </Link>{" "}
        to choose your Gold and Maroon day clubs.
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-neutral-700">Loading…</p>;
  }

  return (
    <div className={CLUB_HUB_CARD}>
      <h2 className="text-lg font-bold text-neutral-900">Gold &amp; Maroon meeting clubs</h2>
      <p className="mt-2 text-sm text-neutral-700">
        Choose one club you attend on Gold days and one on Maroon days, from clubs you
        have joined on the site.
      </p>

      <ClubHubLiveMessage message={switchCooldownError} variant="alert" />
      <ClubHubLiveMessage message={error} variant="alert" />
      <ClubHubLiveMessage message={message} />

      {memberships.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-700">
          You have not joined any clubs yet.{" "}
          <Link href="/club-hub/directory" className="font-semibold text-[#5c1417] hover:underline">
            Browse the directory
          </Link>{" "}
          and use Join club on a club page.
        </p>
      ) : (
        <form onSubmit={handleSave} className="mt-6 space-y-5">
          <div>
            <label htmlFor="gold-club" className="block text-sm font-semibold text-neutral-900">
              Gold day club
            </label>
            {goldOptions.length === 0 ? (
              <p className="mt-1 text-sm text-neutral-700">
                None of your joined clubs meet on Gold days. Join a Gold day club from the{" "}
                <Link href="/club-hub/directory" className="text-[#5c1417] underline">
                  directory
                </Link>
                .
              </p>
            ) : (
              <select
                id="gold-club"
                value={goldClubSlug}
                onChange={(e) => setGoldClubSlug(e.target.value)}
                className="mt-1 w-full max-w-md rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="">— Select a club —</option>
                {goldOptions.map((m) => (
                  <option key={m.clubSlug} value={m.clubSlug}>
                    {m.clubName || m.clubSlug}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="maroon-club" className="block text-sm font-semibold text-neutral-900">
              Maroon day club
            </label>
            {maroonOptions.length === 0 ? (
              <p className="mt-1 text-sm text-neutral-700">
                None of your joined clubs meet on Maroon days. Join a Maroon day club from the{" "}
                <Link href="/club-hub/directory" className="text-[#5c1417] underline">
                  directory
                </Link>
                .
              </p>
            ) : (
              <select
                id="maroon-club"
                value={maroonClubSlug}
                onChange={(e) => setMaroonClubSlug(e.target.value)}
                className="mt-1 w-full max-w-md rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="">— Select a club —</option>
                {maroonOptions.map((m) => (
                  <option key={m.clubSlug} value={m.clubSlug}>
                    {m.clubName || m.clubSlug}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            type="submit"
            disabled={
              saving ||
              Boolean(switchCooldownError) ||
              (goldOptions.length === 0 && maroonOptions.length === 0)
            }
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${clubHubButtonFocusClass}`}
            style={{ backgroundColor: CLUB_HUB_MAROON }}
          >
            {saving ? "Saving…" : "Save choices"}
          </button>
        </form>
      )}
    </div>
  );
}
