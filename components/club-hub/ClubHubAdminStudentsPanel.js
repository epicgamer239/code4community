"use client";

import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/utils/AuthContext";
import StudentHubDirectory from "@/components/club-hub/StudentHubDirectory";
import ClubHubLiveMessage from "@/components/club-hub/ClubHubLiveMessage";
import { clubHubButtonFocusClass } from "@/lib/club-hub/a11y";
import { membershipHasBoardGroup } from "@/lib/club-hub/boardMembersClient";
import { formatJoinedAt } from "@/lib/club-hub/clubMemberships";
import { useMeetingDayOverrides } from "@/lib/club-hub/clubMeetingDays";
import { meetingChoicesFromMemberships } from "@/lib/club-hub/seminarMembershipLimit";
import {
  adminRemoveStudentFromClubClient,
  adminSetStudentSpecialEventClient,
  fetchStudentHubProfileByEmailClient,
  fetchStudentHubProfileClient,
} from "@/lib/club-hub/adminStudentsClient";

export default function ClubHubAdminStudentsPanel() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useMeetingDayOverrides();

  const applyProfile = useCallback((data) => {
    setProfile(data);
  }, []);

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
        applyProfile(data);
      } catch (err) {
        setProfile(null);
        setError(err.message || "Could not load student.");
      } finally {
        setLoading(false);
      }
    },
    [user, applyProfile],
  );

  const openStudentFromDirectory = useCallback(
    async ({ email, displayName }) => {
      if (!user?.getIdToken || !email) return;
      setLoading(true);
      setError("");
      setMessage("");
      setProfile(null);
      try {
        const data = await fetchStudentHubProfileByEmailClient(user, email);
        applyProfile(data);
      } catch (err) {
        setProfile(null);
        setError(
          err.message ||
            `${displayName} has not created a site account yet.`,
        );
      } finally {
        setLoading(false);
      }
    },
    [user, applyProfile],
  );

  const memberships = useMemo(() => profile?.memberships || [], [profile?.memberships]);
  const seminarChoices = useMemo(
    () => meetingChoicesFromMemberships(memberships),
    [memberships],
  );
  const goldMembership =
    memberships.find((m) => m.clubSlug === seminarChoices.goldClubSlug) || null;
  const maroonMembership =
    memberships.find((m) => m.clubSlug === seminarChoices.maroonClubSlug) || null;

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
      <section aria-label="Student directory">
        <StudentHubDirectory
          key={user?.uid || "signed-out"}
          user={user}
          selectedEmail={profile?.email || ""}
          onSelect={(student) => {
            void openStudentFromDirectory(student);
          }}
        />
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
            <h3 className="font-bold text-neutral-900">Seminar clubs</h3>
            <p className="mt-1 text-sm text-neutral-700">
              One Gold day club and one Maroon day club, taken from the clubs this student has
              joined. Change them by removing a club membership above.
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-700">
                  Gold day club
                </dt>
                <dd className="mt-1 text-sm font-medium text-neutral-900">
                  {goldMembership?.clubName || goldMembership?.clubSlug || "— None —"}
                </dd>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-700">
                  Maroon day club
                </dt>
                <dd className="mt-1 text-sm font-medium text-neutral-900">
                  {maroonMembership?.clubName || maroonMembership?.clubSlug || "— None —"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-[14px] bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h3 className="font-bold text-neutral-900">Seminar signups</h3>
            <p className="mt-1 text-sm text-neutral-700">
              One-off seminars from the Seminar events tab (columns on the student meeting sheet).
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
