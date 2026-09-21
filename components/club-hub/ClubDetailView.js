"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { runEffectWork } from "@/hooks/runEffectWork";
import Link from "next/link";
import { useAuth } from "@/utils/AuthContext";
import { logClientError } from "@/lib/auth/logClientError";
import { useClubHubAccess } from "@/lib/club-hub/useClubHubAccess";
import {
  DEFAULT_CLUB_HEADER_IMAGE,
  DEFAULT_CLUB_PAGE_INFO,
  fetchClubPageInfo,
  saveClubPageInfo,
  uploadClubHeaderImage,
  validateClubHeaderFile,
} from "@/lib/club-hub/clubPages";
import ClubHubNav from "@/components/club-hub/ClubHubNav";
import ClubEventsEditor from "@/components/club-hub/ClubEventsEditor";
import ClubMembershipButton from "@/components/club-hub/ClubMembershipButton";
import ClubPageEditor from "@/components/club-hub/ClubPageEditor";
import ClubEventsSection from "@/components/club-hub/ClubEventsSection";
import {
  fetchClubEventsForClub,
  isPastDateKey,
} from "@/lib/club-hub/clubEvents";
import {
  fetchUserClubMembership,
  joinClub,
  leaveClub,
} from "@/lib/club-hub/clubMemberships";
import { resolveDisplayName } from "@/lib/profile";
import {
  CLUB_HUB_CARD,
  CLUB_HUB_HEADING,
  CLUB_HUB_MAROON,
  CLUB_HUB_PAGE_BG,
} from "@/lib/club-hub/theme";

function SectionTitle({ children }) {
  return (
    <h2
      className="w-fit text-[1.35rem] font-bold leading-tight tracking-tight"
      style={{
        color: CLUB_HUB_HEADING,
        borderBottom: `2px solid ${CLUB_HUB_HEADING}`,
        paddingBottom: "2px",
      }}
    >
      {children}
    </h2>
  );
}

function InfoRow({ label, children }) {
  return (
    <div className="text-[15px] leading-[1.55] text-[#1f2937]">
      <span className="font-bold text-[#111827]">{label}:</span>{" "}
      <span className="font-normal text-[#1f2937]">{children}</span>
    </div>
  );
}

function emailList(text) {
  return String(text || "")
    .split(/[\n,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);
}

function ResourcesButton({ href, label, disabledTitle }) {
  const className =
    "inline-flex min-h-[2.85rem] min-w-[14rem] max-w-full items-center justify-center rounded-[10px] px-6 py-2.5 text-center text-[14px] font-semibold leading-snug text-white shadow-[0_1px_3px_rgba(0,0,0,0.18)] transition hover:opacity-92 sm:min-w-[16rem]";
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        style={{ backgroundColor: CLUB_HUB_MAROON }}
      >
        {label}
      </a>
    );
  }
  return (
    <span
      className={`${className} cursor-default opacity-75`}
      style={{ backgroundColor: CLUB_HUB_MAROON }}
      title={disabledTitle}
    >
      {label}
    </span>
  );
}

/**
 * @param {{
 *   club: { name: string, sponsors: { name: string, email: string }[] },
 *   slug: string,
 * }} props
 */
export default function ClubDetailView({ club, slug }) {
  const { user, userData, loading: authLoading } = useAuth();
  const { sponsorOverrides, loading: accessLoading, canEdit } = useClubHubAccess();
  const canEditPage = canEdit(slug);

  const emptyInfo = useMemo(
    () => ({ ...DEFAULT_CLUB_PAGE_INFO }),
    [],
  );

  const [info, setInfo] = useState(emptyInfo);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(emptyInfo);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [headerFile, setHeaderFile] = useState(null);
  const [headerPreview, setHeaderPreview] = useState("");
  const [clearHeader, setClearHeader] = useState(false);
  const [clubEvents, setClubEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsEditorOpen, setEventsEditorOpen] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [membershipLoading, setMembershipLoading] = useState(true);
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinMessage, setJoinMessage] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoadingInfo(true);
      try {
        const data = await fetchClubPageInfo(slug, sponsorOverrides);
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
  }, [slug, sponsorOverrides]);

  const loadClubEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const list = await fetchClubEventsForClub(slug);
      setClubEvents(list);
    } catch (err) {
      logClientError("ClubDetailView.loadClubEvents", err);
      setClubEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      await loadClubEvents();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadClubEvents]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      if (!user?.uid) {
        setIsMember(false);
        setMembershipLoading(false);
        return;
      }
      setMembershipLoading(true);
      try {
        const membership = await fetchUserClubMembership(slug, user.uid);
        if (!cancelled) setIsMember(!!membership);
      } catch (err) {
        logClientError("ClubDetailView.membership", err);
        if (!cancelled) setIsMember(false);
      } finally {
        if (!cancelled) setMembershipLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, user?.uid]);

  const upcomingEvents = useMemo(
    () =>
      clubEvents
        .filter((ev) => !isPastDateKey(ev.date))
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)),
    [clubEvents],
  );

  useEffect(() => {
    if (!headerFile) {
      return runEffectWork(() => setHeaderPreview(""));
    }
    let url;
    return runEffectWork(() => {
      url = URL.createObjectURL(headerFile);
      setHeaderPreview(url);
      return () => URL.revokeObjectURL(url);
    });
  }, [headerFile]);

  const startEdit = () => {
    setDraft(info);
    setHeaderFile(null);
    setClearHeader(false);
    setEditing(true);
    setMessage("");
    setError("");
  };

  const cancelEdit = () => {
    setDraft(info);
    setHeaderFile(null);
    setClearHeader(false);
    setEditing(false);
    setError("");
  };

  const handleJoinLeave = async () => {
    if (!user?.uid || joinBusy) return;
    setJoinBusy(true);
    setJoinMessage("");
    setError("");
    try {
      if (isMember) {
        await leaveClub({ clubSlug: slug, userId: user.uid });
        setIsMember(false);
        setJoinMessage("You left this club.");
      } else {
        await joinClub({
          clubSlug: slug,
          clubName: club.name,
          userId: user.uid,
          userEmail: user.email || userData?.email || "",
          displayName: resolveDisplayName(userData, user.displayName || "Member"),
        });
        setIsMember(true);
        setJoinMessage("You joined this club!");
      }
    } catch (err) {
      setError(err.message || "Could not update membership.");
    } finally {
      setJoinBusy(false);
    }
  };

  const pickImage = (file, onOk) => {
    if (!file) return;
    const validation = validateClubHeaderFile(file);
    if (validation) {
      setError(validation);
      return;
    }
    setError("");
    onOk(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      let headerImageUrl = String(draft.headerImageUrl || "").trim();
      if (clearHeader) headerImageUrl = "";
      else if (headerFile) {
        headerImageUrl = await uploadClubHeaderImage(slug, headerFile, user.uid);
      }

      const saved = await saveClubPageInfo({
        slug,
        info: { ...draft, headerImageUrl },
        adminUid: user.uid,
        overridesBySlug: sponsorOverrides,
      });
      setInfo(saved);
      setDraft(saved);
      setHeaderFile(null);
      setClearHeader(false);
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
  const resourcesLabel = info.resourcesLabel || "Club resources / public drive";
  const displayHeaderSrc =
    (editing
      ? headerPreview ||
        (!clearHeader ? draft.headerImageUrl : "") ||
        DEFAULT_CLUB_HEADER_IMAGE
      : info.headerImageUrl) || DEFAULT_CLUB_HEADER_IMAGE;

  return (
    <div className="min-h-screen text-neutral-900" style={{ backgroundColor: CLUB_HUB_PAGE_BG }}>
      <section className="relative min-h-[210px] overflow-hidden sm:min-h-[248px] md:min-h-[268px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={displayHeaderSrc}
          alt=""
          className="absolute inset-0 h-full w-full scale-[1.02] object-cover object-center blur-[1.5px]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.22) 100%)",
          }}
          aria-hidden
        />
        <div className="relative z-10 flex min-h-[210px] flex-col items-center justify-center px-6 py-8 text-center sm:min-h-[248px] sm:py-9 md:min-h-[268px]">
          <h1 className="max-w-5xl text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            {club.name}
          </h1>
        </div>
      </section>

      <ClubHubNav
        active="directory"
        loginRedirect={`/club-hub/directory/${slug}`}
      />

      <div className="w-full px-4 pt-4.5 pb-4 sm:px-6 sm:pt-6 sm:pb-5 lg:px-10">
        {message && (
          <p className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            {message}
          </p>
        )}
        {joinMessage && (
          <p className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            {joinMessage}
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        {editing ? (
          <ClubPageEditor
            draft={draft}
            setField={setField}
            headerPreview={headerPreview}
            headerFile={headerFile}
            clearHeader={clearHeader}
            fileInputRef={fileInputRef}
            onHeaderFileSelected={(f) => {
              if (!f) {
                setHeaderFile(null);
                return;
              }
              pickImage(f, (file) => {
                setClearHeader(false);
                setHeaderFile(file);
              });
            }}
            onClearHeader={() => {
              setHeaderFile(null);
              setClearHeader(true);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            onCancel={cancelEdit}
            onSubmit={handleSave}
            saving={saving}
            headingColor={CLUB_HUB_HEADING}
            cardClass={CLUB_HUB_CARD}
          />
        ) : (
          <div className="grid w-full items-stretch gap-4 md:grid-cols-2 md:gap-5">
            <section className={`${CLUB_HUB_CARD} flex h-full flex-col`}>
              <SectionTitle>About Us</SectionTitle>
              <p className="mt-3 flex-1 whitespace-pre-wrap text-[15px] leading-[1.55] text-[#1f2937]">
                {loadingInfo ? "Loading…" : info.about}
              </p>
              <hr className="mt-4 w-full border-0 border-t border-[#d1d5db]" />
              <div className="mt-4 flex justify-center">
                <ResourcesButton
                  href={resourcesHref}
                  label={resourcesLabel}
                  disabledTitle={
                    canEditPage ? "Add a resources URL in Edit page" : undefined
                  }
                />
              </div>
            </section>

            <section className={`${CLUB_HUB_CARD} h-full`}>
              <div className="flex items-start justify-between gap-3">
                <SectionTitle>Club Information</SectionTitle>
                {!authLoading && !accessLoading && canEditPage ? (
                  <button
                    type="button"
                    onClick={startEdit}
                    className="shrink-0 rounded-lg px-3 py-1 text-xs font-semibold text-white shadow-sm hover:opacity-90 sm:px-3.5 sm:py-1.5 sm:text-sm"
                    style={{ backgroundColor: CLUB_HUB_MAROON }}
                  >
                    Edit page
                  </button>
                ) : (
                  <ClubMembershipButton
                    slug={slug}
                    user={user}
                    userData={userData}
                    authLoading={authLoading}
                    accessLoading={accessLoading}
                    membershipLoading={membershipLoading}
                    isMember={isMember}
                    joinBusy={joinBusy}
                    onJoinLeave={handleJoinLeave}
                  />
                )}
              </div>
              <div className="mt-4 space-y-3">
                <InfoRow label="Club Leaders">
                  {info.clubLeaders || (loadingInfo ? "…" : "—")}
                </InfoRow>
                <InfoRow label="Faculty advisor">
                  {info.facultyAdvisor || (loadingInfo ? "…" : "—")}
                </InfoRow>
                <div className="text-[15px] leading-[1.55] text-[#1f2937]">
                  <span className="font-bold text-[#111827]">Contact emails:</span>
                  {contacts.length === 0 ? (
                    <span> {loadingInfo ? "…" : "—"}</span>
                  ) : (
                    <ul className="mt-1 space-y-0.5 pl-0">
                      {contacts.map((email) => (
                        <li key={email} className="break-all font-normal text-[#1f2937]">
                          {email}
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
        )}
      </div>

      <ClubEventsSection
        loadingEvents={loadingEvents}
        upcomingEvents={upcomingEvents}
        canEdit={canEditPage}
        authLoading={authLoading}
        accessLoading={accessLoading}
        onOpenEditor={() => setEventsEditorOpen(true)}
      />

      <ClubEventsEditor
        open={eventsEditorOpen}
        onClose={() => setEventsEditorOpen(false)}
        clubSlug={slug}
        clubName={club.name}
        adminUid={user?.uid || ""}
        onChanged={loadClubEvents}
      />

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
