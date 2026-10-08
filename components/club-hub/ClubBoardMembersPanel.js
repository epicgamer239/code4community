"use client";

import { useCallback, useEffect, useState } from "react";
import { runEffectWork } from "@/hooks/runEffectWork";
import { useAuth } from "@/utils/AuthContext";
import ClubHubLiveMessage from "@/components/club-hub/ClubHubLiveMessage";
import { clubHasBoardMemberGroup } from "@/lib/club-hub/clubBoardGroups";
import {
  addBoardMemberClient,
  fetchBoardMembersForClubClient,
  removeBoardMemberClient,
} from "@/lib/club-hub/boardMembersClient";
import {
  canManageClubHubRoles,
  getSponsorClubSlugsForEmail,
} from "@/lib/club-hub/access";
import { clubHubButtonFocusClass } from "@/lib/club-hub/a11y";
import { CLUB_HUB_CARD, CLUB_HUB_MAROON } from "@/lib/club-hub/theme";
import { invalidateClubHubAccessCache, useClubHubAccess } from "@/lib/club-hub/useClubHubAccess";

const MAROON = CLUB_HUB_MAROON;

/**
 * @param {{ clubSlug: string, clubName: string, compact?: boolean, embed?: boolean }} props
 */
export default function ClubBoardMembersPanel({
  clubSlug,
  clubName,
  compact = false,
  embed = false,
}) {
  const { user, userData } = useAuth();
  const { sponsorOverrides, accessRecord, loading: accessLoading } = useClubHubAccess();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  const canManage =
    Boolean(user?.email) &&
    (canManageClubHubRoles(user.email, userData, accessRecord) ||
      getSponsorClubSlugsForEmail(user.email, sponsorOverrides).includes(clubSlug));

  const load = useCallback(async () => {
    if (!user || !clubSlug || !canManage) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const rows = await fetchBoardMembersForClubClient(user, clubSlug);
      setMembers(rows);
    } catch (err) {
      setError(err.message || "Could not load board members.");
    } finally {
      setLoading(false);
    }
  }, [user, clubSlug, canManage]);

  useEffect(() => {
    return runEffectWork(() => {
      void load();
    });
  }, [load]);

  if (!user) return null;

  if (accessLoading) {
    return <p className="text-sm text-neutral-700">Loading…</p>;
  }

  if (!canManage) {
    return (
      <p className="text-sm text-neutral-700">
        You don&apos;t have permission to manage board members for this club.
      </p>
    );
  }

  const hasBoardGroup = clubHasBoardMemberGroup(clubSlug);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!user || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await addBoardMemberClient(user, { clubSlug, email });
      setEmail("");
      await load();
      invalidateClubHubAccessCache();
      if (result.pendingSignup) {
        setMessage(
          "Board editor access granted. They will be added to the board roster when they sign up with that email.",
        );
      } else if (hasBoardGroup) {
        setMessage("Board member added with edit access and board roster group.");
      } else {
        setMessage("Board editor access granted for this club.");
      }
    } catch (err) {
      setError(err.message || "Could not add board member.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (memberEmail) => {
    if (!user || saving || !window.confirm(`Remove ${memberEmail} from board editors?`)) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await removeBoardMemberClient(user, { clubSlug, email: memberEmail });
      await load();
      setMessage("Board member removed.");
    } catch (err) {
      setError(err.message || "Could not remove board member.");
    } finally {
      setSaving(false);
    }
  };

  const wrapperClass = embed
    ? "space-y-3"
    : compact
      ? "mt-6 space-y-3"
      : `${CLUB_HUB_CARD} space-y-4`;

  return (
    <section className={wrapperClass} aria-labelledby={`board-members-${clubSlug}`}>
      <div>
        <h2
          id={`board-members-${clubSlug}`}
          className={compact ? "text-base font-bold text-neutral-900" : "text-lg font-bold text-neutral-900"}
        >
          Board members
        </h2>
        <p className="mt-1 text-sm text-neutral-700">
          Add student board members by email. They can edit {clubName} on Club Hub.
          {hasBoardGroup
            ? " They are also placed in the board member roster group for this club."
            : " This club has no separate board roster group on the directory."}
        </p>
      </div>

      <ClubHubLiveMessage message={error} variant="alert" />
      <ClubHubLiveMessage message={message} />

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1">
          <label htmlFor={`board-email-${clubSlug}`} className="block text-xs font-semibold text-neutral-700">
            Student email
          </label>
          <input
            id={`board-email-${clubSlug}`}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            placeholder="student@lcps.org"
            disabled={saving}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${clubHubButtonFocusClass}`}
          style={{ backgroundColor: MAROON }}
        >
          {saving ? "Saving…" : "Add board member"}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-neutral-700">Loading board list…</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-neutral-700">No board members listed yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {members.map((m) => (
            <li
              key={m.email}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
            >
              <div>
                <p className="font-semibold text-neutral-900">{m.displayName || m.email}</p>
                <p className="text-neutral-700">{m.email}</p>
                {!m.uid ? (
                  <p className="text-xs text-neutral-600">Pending first sign-in</p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleRemove(m.email)}
                className="rounded-md px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
