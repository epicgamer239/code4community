"use client";

import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/utils/AuthContext";
import StudentHubAutocomplete from "@/components/club-hub/StudentHubAutocomplete";
import ClubHubLiveMessage from "@/components/club-hub/ClubHubLiveMessage";
import { clubHubButtonFocusClass } from "@/lib/club-hub/a11y";
import { membershipHasBoardGroup } from "@/lib/club-hub/boardMembersClient";
import { formatJoinedAt } from "@/lib/club-hub/clubMemberships";
import { getClubBySlug } from "@/lib/club-hub/broadRunClubDirectory";
import {
  canPickClubForGoldMeetingDay,
  canPickClubForMaroonMeetingDay,
} from "@/lib/club-hub/meetingDayBoardAccess";
import {
  adminRemoveStudentFromClubClient,
  adminSetStudentMeetingChoicesClient,
  adminSetStudentSpecialEventClient,
  fetchStudentHubProfileClient,
} from "@/lib/club-hub/adminStudentsClient";
import { CLUB_HUB_MAROON } from "@/lib/club-hub/theme";

export default function ClubHubAdminStudentsPanel() {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [goldClubSlug, setGoldClubSlug] = useState("");
  const [maroonClubSlug, setMaroonClubSlug] = useState("");

  const loadProfile = useCallback(
    async (userId) => {
      if (!user?.getIdToken || !userId) {
        setProfile(null);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const data = await fetchStudentHubProfileClient(user, userId);
        setProfile(data);
        setGoldClubSlug(data.meetingChoices?.goldClubSlug || "");
        setMaroonClubSlug(data.meetingChoices?.maroonClubSlug || "");
      } catch (err) {
        setProfile(null);
        setError(err.message || "Could not load student.");
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  const goldOptions = useMemo(
    () => (profile?.memberships || []).filter((m) => canPickClubForGoldMeetingDay(m)),
    [profile?.memberships],
  );

  const maroonOptions = useMemo(
    () => (profile?.memberships || []).filter((m) => canPickClubForMaroonMeetingDay(m)),
    [profile?.memberships],
  );

  const memberships = profile?.memberships || [];

  const handleRemoveClub = async (clubSlug, clubName) => {
    if (!user || !profile?.userId || busy) return;
    if (!window.confirm(`Remove ${profile.displayName} from ${clubName}?`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await adminRemoveStudentFromClubClient(user, {
        userId: profile.userId,
        clubSlug,
      });
      setMessage(`Removed from ${clubName}.`);
      await loadProfile(profile.userId);
    } catch (err) {
      setError(err.message || "Could not remove from club.");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveMeetingChoices = async (e) => {
    e.preventDefault();
    if (!user || !profile?.userId || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await adminSetStudentMeetingChoicesClient(user, {
        userId: profile.userId,
        goldClubSlug,
        maroonClubSlug,
      });
      setMessage("Meeting day choices updated.");
      await loadProfile(profile.userId);
    } catch (err) {
      setError(err.message || "Could not save meeting choices.");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleSpecialEvent = async (eventId, enrolled, title) => {
    if (!user || !profile?.userId || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await adminSetStudentSpecialEventClient(user, {
        userId: profile.userId,
        eventId,
        enrolled,
      });
      setMessage(
        enrolled ? `Added to “${title}”.` : `Removed from “${title}”.`,
      );
      await loadProfile(profile.userId);
    } catch (err) {
      setError(err.message || "Could not update seminar signup.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-neutral-900">Find a student</h2>
        <p className="mt-1 text-sm text-neutral-700">
          Search by name or email to view clubs, meeting-day picks, and special seminar signups.
        </p>
      </div>

      <section aria-labelledby="admin-student-search-heading">
        <h3 id="admin-student-search-heading" className="text-base font-bold text-neutral-900">
          Search a student
        </h3>
        <div className="mt-4 sm:max-w-md">
          <StudentHubAutocomplete
            user={user}
            id="admin-student-search"
            onSelect={(student) => {
              if (!student.userId) return;
              setSelectedUserId(student.userId);
              setMessage("");
              setError("");
              void loadProfile(student.userId);
            }}
          />
        </div>
        {!selectedUserId ? (
          <p className="mt-4 text-sm text-neutral-700">
            Pick a student with a site account to manage their Club Hub data.
          </p>
        ) : null}
      </section>

      <ClubHubLiveMessage message={error} variant="alert" />
      <ClubHubLiveMessage message={message} />

      {loading ? (
        <p className="text-sm text-neutral-700" role="status">
          Loading student…
        </p>
      ) : null}

      {profile && !loading ? (
        <div className="space-y-6">
          <div className="rounded-[14px] bg-white p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-lg font-bold text-neutral-900">{profile.displayName}</p>
            <p className="text-sm text-neutral-700">{profile.email || "—"}</p>
          </div>

          <section className="rounded-[14px] bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h3 className="font-bold text-neutral-900">Clubs joined</h3>
            {memberships.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-700">Not in any clubs on the site.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-700">
                      <th className="py-2 pr-3 font-semibold">Club</th>
                      <th className="py-2 pr-3 font-semibold">Joined</th>
                      <th className="py-2 pr-3 font-semibold">Groups</th>
                      <th className="py-2 font-semibold">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {memberships.map((m) => (
                      <tr key={m.id}>
                        <td className="py-2 pr-3 font-medium text-neutral-900">
                          {m.clubName || m.clubSlug}
                        </td>
                        <td className="py-2 pr-3 text-neutral-700">
                          {formatJoinedAt(m.joinedAt)}
                        </td>
                        <td className="py-2 pr-3 text-neutral-700">
                          {membershipHasBoardGroup(m.memberGroups) ? "Board" : "—"}
                        </td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              handleRemoveClub(m.clubSlug, m.clubName || m.clubSlug)
                            }
                            className={`rounded-md px-2 py-1 text-xs font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50 ${clubHubButtonFocusClass}`}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-[14px] bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h3 className="font-bold text-neutral-900">Gold &amp; Maroon meeting clubs</h3>
            <p className="mt-1 text-sm text-neutral-700">
              Same choices as the student meeting-days page. Admin saves skip the 30-minute switch
              cooldown.
            </p>
            <form onSubmit={handleSaveMeetingChoices} className="mt-4 space-y-4">
              <div>
                <label htmlFor="admin-student-gold" className="block text-xs font-semibold text-neutral-700">
                  Gold day club
                </label>
                <select
                  id="admin-student-gold"
                  value={goldClubSlug}
                  disabled={busy}
                  onChange={(e) => setGoldClubSlug(e.target.value)}
                  className="mt-1 w-full max-w-md rounded-md border border-neutral-300 px-3 py-2 text-sm"
                >
                  <option value="">— None —</option>
                  {goldOptions.map((m) => (
                    <option key={m.clubSlug} value={m.clubSlug}>
                      {m.clubName || getClubBySlug(m.clubSlug)?.name || m.clubSlug}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="admin-student-maroon"
                  className="block text-xs font-semibold text-neutral-700"
                >
                  Maroon day club
                </label>
                <select
                  id="admin-student-maroon"
                  value={maroonClubSlug}
                  disabled={busy}
                  onChange={(e) => setMaroonClubSlug(e.target.value)}
                  className="mt-1 w-full max-w-md rounded-md border border-neutral-300 px-3 py-2 text-sm"
                >
                  <option value="">— None —</option>
                  {maroonOptions.map((m) => (
                    <option key={m.clubSlug} value={m.clubSlug}>
                      {m.clubName || getClubBySlug(m.clubSlug)?.name || m.clubSlug}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={busy}
                className={`rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${clubHubButtonFocusClass}`}
                style={{ backgroundColor: CLUB_HUB_MAROON }}
              >
                {busy ? "Saving…" : "Save meeting choices"}
              </button>
            </form>
          </section>

          <section className="rounded-[14px] bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h3 className="font-bold text-neutral-900">Special seminars</h3>
            <p className="mt-1 text-sm text-neutral-700">
              One-off events from the Special events tab (columns on the student meeting sheet).
            </p>
            {(profile.specialEvents || []).length === 0 ? (
              <p className="mt-2 text-sm text-neutral-700">No special events configured.</p>
            ) : (
              <ul className="mt-3 divide-y divide-neutral-200">
                {profile.specialEvents.map((ev) => (
                  <li key={ev.id} className="flex items-start gap-3 py-3">
                    <input
                      id={`special-ev-${ev.id}`}
                      type="checkbox"
                      checked={Boolean(ev.enrolled)}
                      disabled={busy}
                      onChange={(e) =>
                        handleToggleSpecialEvent(ev.id, e.target.checked, ev.title)
                      }
                      className="mt-1 h-4 w-4 rounded border-neutral-300"
                    />
                    <label htmlFor={`special-ev-${ev.id}`} className="min-w-0 flex-1 text-sm">
                      <span className="font-medium text-neutral-900">{ev.title}</span>
                      <span className="block text-neutral-600">{ev.columnLabel}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
