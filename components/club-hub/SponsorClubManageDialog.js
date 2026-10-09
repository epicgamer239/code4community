"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import ClubBoardMembersPanel from "@/components/club-hub/ClubBoardMembersPanel";
import ClubHubClubExtraEditorsPanel from "@/components/club-hub/ClubHubClubExtraEditorsPanel";
import ClubHubClubSponsorsEditor from "@/components/club-hub/ClubHubClubSponsorsEditor";
import { clubHubButtonFocusClass } from "@/lib/club-hub/a11y";
import { membershipHasBoardGroup } from "@/lib/club-hub/boardMembersClient";
import { formatJoinedAt } from "@/lib/club-hub/clubMemberships";

/**
 * @typedef {"menu" | "roster" | "board" | "editors" | "sponsors"} ClubManageDialogPanel
 */

/**
 * @param {{
 *   club: { slug: string, name: string } | null,
 *   variant?: "sponsor" | "admin",
 *   panel: ClubManageDialogPanel,
 *   metrics: { members: number, upcomingEvents: number } | null,
 *   roster: import("@/lib/club-hub/clubMemberships.js").NormalizedClubMembership[],
 *   rosterLoading: boolean,
 *   rosterRemoveBusyUserId?: string | null,
 *   onRemoveRosterMember?: (member: import("@/lib/club-hub/clubMemberships.js").NormalizedClubMembership) => void | Promise<void>,
 *   onPanelChange: (panel: ClubManageDialogPanel) => void,
 *   onClose: () => void,
 *   dialogMessage?: string,
 *   dialogError?: string,
 *   adminAccess?: {
 *     records: NonNullable<ReturnType<import("@/lib/club-hub/clubHubRoles").normalizeAccessRecord>>[],
 *     sponsorOverrides: Record<string, unknown>,
 *     busy: boolean,
 *     onBusyChange: (busy: boolean) => void,
 *     user: { uid: string, getIdToken?: () => Promise<string> } | null,
 *     onAccessMutated: () => void | Promise<void>,
 *     onDialogMessage: (text: string) => void,
 *     onDialogError: (text: string) => void,
 *   },
 * }} props
 */
export default function SponsorClubManageDialog({
  club,
  variant = "sponsor",
  panel,
  metrics,
  roster,
  rosterLoading,
  onPanelChange,
  onClose,
  dialogMessage = "",
  dialogError = "",
  adminAccess = null,
}) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!club) return undefined;
    closeButtonRef.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [club, onClose]);

  if (!club) return null;

  const actionBtn =
    "flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3.5 text-left text-sm font-semibold text-neutral-900 shadow-sm transition-colors hover:border-[#5c1417]/40 hover:bg-rose-50/50";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sponsor-club-dialog-title"
        className="flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4">
          <div className="min-w-0">
            {panel !== "menu" ? (
              <button
                type="button"
                onClick={() => onPanelChange("menu")}
                className={`mb-1 text-xs font-semibold text-[#5c1417] hover:underline ${clubHubButtonFocusClass}`}
              >
                ← Back
              </button>
            ) : null}
            <h2 id="sponsor-club-dialog-title" className="truncate text-lg font-bold text-neutral-900">
              {club.name}
            </h2>
            {metrics && panel === "menu" ? (
              <p className="mt-0.5 text-sm text-neutral-700">
                {metrics.members} member{metrics.members === 1 ? "" : "s"} · {metrics.upcomingEvents}{" "}
                upcoming event{metrics.upcomingEvents === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className={`shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 ${clubHubButtonFocusClass}`}
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {dialogError ? (
            <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {dialogError}
            </p>
          ) : null}
          {dialogMessage ? (
            <p className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
              {dialogMessage}
            </p>
          ) : null}

          {panel === "menu" ? (
            <div className="space-y-3">
              <button type="button" className={actionBtn} onClick={() => onPanelChange("roster")}>
                <span>
                  View roster
                  <span className="mt-0.5 block text-xs font-normal text-neutral-600">
                    Members who joined on the site
                  </span>
                </span>
              </button>
              <button type="button" className={actionBtn} onClick={() => onPanelChange("board")}>
                <span>
                  Edit board members
                  <span className="mt-0.5 block text-xs font-normal text-neutral-600">
                    Grant edit access &amp; board roster
                  </span>
                </span>
              </button>
              {variant === "admin" && adminAccess ? (
                <>
                  <button
                    type="button"
                    className={actionBtn}
                    onClick={() => onPanelChange("editors")}
                  >
                    <span>
                      Extra club editors
                      <span className="mt-0.5 block text-xs font-normal text-neutral-600">
                        Manual edit access for this club
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={actionBtn}
                    onClick={() => onPanelChange("sponsors")}
                  >
                    <span>
                      Club sponsors
                      <span className="mt-0.5 block text-xs font-normal text-neutral-600">
                        Names and emails shown on the directory
                      </span>
                    </span>
                  </button>
                </>
              ) : null}
              <Link
                href={`/club-hub/directory/${club.slug}`}
                className={`block text-center text-sm font-semibold text-[#5c1417] hover:underline ${clubHubButtonFocusClass}`}
              >
                Open club page
              </Link>
            </div>
          ) : null}

          {panel === "roster" ? (
            rosterLoading ? (
              <p className="text-sm text-neutral-700">Loading roster…</p>
            ) : roster.length === 0 ? (
              <p className="text-sm text-neutral-700">No members have joined yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-700">
                      <th className="py-2 pr-3 font-semibold">Name</th>
                      <th className="py-2 pr-3 font-semibold">Email</th>
                      <th className="py-2 pr-3 font-semibold">Joined</th>
                      <th className="py-2 pr-3 font-semibold">Groups</th>
                      {onRemoveRosterMember ? (
                        <th className="py-2 font-semibold">
                          <span className="sr-only">Actions</span>
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {roster.map((member) => {
                      const removeBusy = rosterRemoveBusyUserId === member.userId;
                      return (
                      <tr key={member.id}>
                        <td className="py-2 pr-3 font-medium text-neutral-900">
                          {member.displayName || "—"}
                        </td>
                        <td className="py-2 pr-3 break-all text-neutral-700">
                          {member.userEmail || "—"}
                        </td>
                        <td className="py-2 pr-3 text-neutral-700">
                          {formatJoinedAt(member.joinedAt)}
                        </td>
                        <td className="py-2 pr-3 text-neutral-700">
                          {membershipHasBoardGroup(member.memberGroups) ? "Board" : "—"}
                        </td>
                        {onRemoveRosterMember ? (
                          <td className="py-2 text-right">
                            <button
                              type="button"
                              disabled={Boolean(rosterRemoveBusyUserId)}
                              aria-busy={removeBusy}
                              onClick={() => onRemoveRosterMember(member)}
                              className={`rounded-md px-2 py-1 text-xs font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50 ${clubHubButtonFocusClass}`}
                            >
                              {removeBusy ? "Removing…" : "Remove"}
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : null}

          {panel === "board" ? (
            <ClubBoardMembersPanel clubSlug={club.slug} clubName={club.name} compact embed />
          ) : null}

          {panel === "editors" && variant === "admin" && adminAccess ? (
            <ClubHubClubExtraEditorsPanel
              clubSlug={club.slug}
              clubName={club.name}
              records={adminAccess.records}
              user={adminAccess.user}
              busy={adminAccess.busy}
              onBusyChange={adminAccess.onBusyChange}
              onMessage={adminAccess.onDialogMessage}
              onError={adminAccess.onDialogError}
              onSaved={adminAccess.onAccessMutated}
            />
          ) : null}

          {panel === "sponsors" && variant === "admin" && adminAccess ? (
            <ClubHubClubSponsorsEditor
              club={club}
              user={adminAccess.user}
              sponsorOverrides={adminAccess.sponsorOverrides}
              busy={adminAccess.busy}
              onBusyChange={adminAccess.onBusyChange}
              onMessage={adminAccess.onDialogMessage}
              onError={adminAccess.onDialogError}
              onSaved={adminAccess.onAccessMutated}
            />
          ) : null}

        </div>
      </div>
    </div>
  );
}
