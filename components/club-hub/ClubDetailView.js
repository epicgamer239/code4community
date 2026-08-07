"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/utils/AuthContext";
import { isAdminUser } from "@/utils/authorization";
import {
  DEFAULT_CLUB_PAGE_INFO,
  fetchClubPageInfo,
  saveClubPageInfo,
} from "@/lib/club-hub/clubPages";
import ClubHubNav from "@/components/club-hub/ClubHubNav";

const MAROON = "#5c1417";
const MAROON_DARK = "#3f0e10";
const HEADING = "#1e3a5f";

function InfoRow({ label, children }) {
  if (!children) return null;
  return (
    <div className="text-[15px] leading-relaxed text-neutral-800">
      <span className="font-bold">{label}:</span> {children}
    </div>
  );
}

function emailList(text) {
  return String(text || "")
    .split(/[\n,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);
}

/**
 * @param {{
 *   club: { name: string, sponsors: { name: string, email: string }[] },
 *   slug: string,
 * }} props
 */
export default function ClubDetailView({ club, slug }) {
  const { user, userData, loading: authLoading } = useAuth();
  const isAdmin =
    !!user && !!userData && isAdminUser(userData.role, user.email);

  const sponsorKey = club.sponsors?.map((s) => `${s.name}:${s.email}`).join("|") || "";
  const emptyInfo = useMemo(
    () => ({ ...DEFAULT_CLUB_PAGE_INFO, ...sponsorDefaults(club) }),
    [club.name, sponsorKey],
  );

  const [info, setInfo] = useState(emptyInfo);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(emptyInfo);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingInfo(true);
      try {
        const data = await fetchClubPageInfo(slug, club);
        if (!cancelled) {
          setInfo(data);
          setDraft(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load club details.");
        }
      } finally {
        if (!cancelled) setLoadingInfo(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, club]);

  const startEdit = () => {
    setDraft(info);
    setEditing(true);
    setMessage("");
    setError("");
  };

  const cancelEdit = () => {
    setDraft(info);
    setEditing(false);
    setError("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const saved = await saveClubPageInfo({
        slug,
        info: draft,
        adminUid: user.uid,
        club,
      });
      setInfo(saved);
      setDraft(saved);
      setEditing(false);
      setMessage("Club page saved.");
    } catch (err) {
      setError(err.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const setField = (key, value) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const contacts = emailList(info.contactEmails);
  const resourcesHref = info.resourcesUrl?.trim() || null;

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <section className="relative min-h-[240px] sm:min-h-[300px]">
        <Image
          src="/brand/brh.png"
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(60,12,16,0.45) 0%, rgba(60,12,16,0.78) 100%)",
          }}
        />
        <div className="relative z-10 flex min-h-[240px] flex-col items-center justify-center px-6 py-14 text-center sm:min-h-[300px]">
          <h1 className="max-w-4xl text-3xl font-bold tracking-tight text-white drop-shadow-md sm:text-4xl md:text-5xl">
            {club.name}
          </h1>
        </div>
      </section>

      <ClubHubNav
        active="directory"
        loginRedirect={`/club-hub/directory/${slug}`}
      />

      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/club-hub/directory"
            className="text-sm font-medium text-[#5c1417] hover:underline underline-offset-4"
          >
            ← Back to Club Directory
          </Link>
          {!authLoading && isAdmin && !editing && (
            <button
              type="button"
              onClick={startEdit}
              className="rounded-md px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
              style={{ backgroundColor: MAROON }}
            >
              Edit page
            </button>
          )}
        </div>

        {message && (
          <p className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            {message}
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        {editing ? (
          <form
            onSubmit={handleSave}
            className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7 space-y-5"
          >
            <h2 className="text-lg font-bold" style={{ color: HEADING }}>
              Edit club page
            </h2>
            <Field label="About Us" htmlFor="club-about">
                  <textarea
                    id="club-about"
                    rows={5}
                    value={draft.about}
                    onChange={(e) => setField("about", e.target.value)}
                    required
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Resources button label" htmlFor="club-res-label">
                    <input
                      id="club-res-label"
                      type="text"
                      value={draft.resourcesLabel}
                      onChange={(e) => setField("resourcesLabel", e.target.value)}
                    />
                  </Field>
                  <Field label="Resources URL" htmlFor="club-res-url">
                    <input
                      id="club-res-url"
                      type="url"
                      value={draft.resourcesUrl}
                      onChange={(e) => setField("resourcesUrl", e.target.value)}
                      placeholder="https://…"
                    />
                  </Field>
                </div>
                <Field label="Club Leaders" htmlFor="club-leaders">
                  <input
                    id="club-leaders"
                    type="text"
                    value={draft.clubLeaders}
                    onChange={(e) => setField("clubLeaders", e.target.value)}
                    placeholder="Name, Name, Name"
                  />
                </Field>
                <Field label="Faculty advisor" htmlFor="club-advisor">
                  <input
                    id="club-advisor"
                    type="text"
                    value={draft.facultyAdvisor}
                    onChange={(e) => setField("facultyAdvisor", e.target.value)}
                  />
                </Field>
                <Field label="Contact emails (one per line)" htmlFor="club-emails">
                  <textarea
                    id="club-emails"
                    rows={4}
                    value={draft.contactEmails}
                    onChange={(e) => setField("contactEmails", e.target.value)}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Meeting frequency" htmlFor="club-freq">
                    <input
                      id="club-freq"
                      type="text"
                      value={draft.meetingFrequency}
                      onChange={(e) => setField("meetingFrequency", e.target.value)}
                      placeholder="weekly"
                    />
                  </Field>
                  <Field label="Number of members" htmlFor="club-members">
                    <input
                      id="club-members"
                      type="text"
                      value={draft.memberCount}
                      onChange={(e) => setField("memberCount", e.target.value)}
                      placeholder="23"
                    />
                  </Field>
                </div>
                <Field label="Meetings and activities" htmlFor="club-activities">
                  <textarea
                    id="club-activities"
                    rows={4}
                    value={draft.activities}
                    onChange={(e) => setField("activities", e.target.value)}
                    placeholder="Upcoming meetings, events…"
                  />
                </Field>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: MAROON }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_8px_28px_rgba(0,0,0,0.06)]">
            <div className="grid gap-0 md:grid-cols-2 md:divide-x md:divide-neutral-200">
              <section className="p-6 sm:p-8">
                <h2
                  className="text-xl font-bold underline decoration-2 underline-offset-4"
                  style={{ color: HEADING }}
                >
                  About Us
                </h2>
                <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-700">
                  {loadingInfo ? "Loading…" : info.about}
                </p>
                {resourcesHref ? (
                  <a
                    href={resourcesHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                    style={{ backgroundColor: MAROON }}
                  >
                    {info.resourcesLabel || "Club resources / public drive"}
                  </a>
                ) : (
                  <span
                    className="mt-6 inline-flex cursor-default items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold text-white/90 opacity-70"
                    style={{ backgroundColor: MAROON }}
                    title={
                      isAdmin
                        ? "Add a resources URL in Edit page"
                        : undefined
                    }
                  >
                    {info.resourcesLabel || "Club resources / public drive"}
                  </span>
                )}
              </section>

              <section className="border-t border-neutral-200 p-6 sm:p-8 md:border-t-0">
                <h2
                  className="text-xl font-bold underline decoration-2 underline-offset-4"
                  style={{ color: HEADING }}
                >
                  Club Information
                </h2>
                <div className="mt-4 space-y-3">
                  <InfoRow label="Club Leaders">
                    {info.clubLeaders || (loadingInfo ? "…" : "—")}
                  </InfoRow>
                  <InfoRow label="Faculty advisor">
                    {info.facultyAdvisor || (loadingInfo ? "…" : "—")}
                  </InfoRow>
                  <div className="text-[15px] leading-relaxed text-neutral-800">
                    <span className="font-bold">Contact emails:</span>
                    {contacts.length === 0 ? (
                      <span> {loadingInfo ? "…" : "—"}</span>
                    ) : (
                      <ul className="mt-1 space-y-0.5">
                        {contacts.map((email) => (
                          <li key={email}>
                            <a
                              href={`mailto:${email}`}
                              className="break-all text-[#5c1417] underline underline-offset-2 hover:text-[#731a1f]"
                            >
                              {email}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <InfoRow label="Meeting frequency">
                    {info.meetingFrequency || (loadingInfo ? "…" : "—")}
                  </InfoRow>
                  <InfoRow label="Number of members">
                    {info.memberCount || (loadingInfo ? "…" : "—")}
                  </InfoRow>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>

      <section
        className="relative border-t border-black/10"
        style={{
          backgroundColor: MAROON_DARK,
          backgroundImage:
            "linear-gradient(rgba(40,8,10,0.88), rgba(40,8,10,0.92)), url(/brand/brh.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="pointer-events-none absolute inset-0 backdrop-blur-[1px]" aria-hidden />
        <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          <h2 className="text-lg font-bold text-white sm:text-xl">
            Meetings and activities:
          </h2>
          <div className="mt-4 rounded-xl border border-white/15 bg-white/95 p-5 text-[15px] leading-relaxed text-neutral-800 shadow-sm sm:p-6">
            {loadingInfo ? (
              <p className="text-neutral-500">Loading…</p>
            ) : info.activities ? (
              <p className="whitespace-pre-wrap">{info.activities}</p>
            ) : (
              <p className="text-neutral-500">
                No upcoming meetings posted yet.
                {isAdmin ? " Use Edit page to add activities." : ""}
              </p>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-neutral-200 bg-white py-6 text-center text-xs text-neutral-500">
        <Link href="/club-hub/directory" className="text-[#5c1417] hover:underline">
          ← Club Directory
        </Link>
        <span className="mx-2 text-neutral-300">·</span>
        <Link href="/club-hub" className="hover:underline">
          Club Hub
        </Link>
        <span className="mx-2 text-neutral-300">·</span>
        <Link href="/" className="hover:underline">
          Code4Community home
        </Link>
      </footer>
    </div>
  );
}

function sponsorDefaults(club) {
  return {
    facultyAdvisor: club?.sponsors?.map((s) => s.name).filter(Boolean).join(", ") || "",
    contactEmails: club?.sponsors?.map((s) => s.email).filter(Boolean).join("\n") || "",
  };
}

function Field({ label, htmlFor, children }) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold uppercase tracking-wider text-neutral-500"
      >
        {label}
      </label>
      <div className="mt-1.5 [&_input]:mt-0 [&_textarea]:mt-0 [&_input]:block [&_textarea]:block [&_input]:w-full [&_textarea]:w-full [&_input]:rounded-md [&_textarea]:rounded-md [&_input]:border [&_textarea]:border [&_input]:border-neutral-300 [&_textarea]:border-neutral-300 [&_input]:px-3 [&_textarea]:px-3 [&_input]:py-2 [&_textarea]:py-2 [&_input]:text-[15px] [&_textarea]:text-[15px]">
        {children}
      </div>
    </div>
  );
}
