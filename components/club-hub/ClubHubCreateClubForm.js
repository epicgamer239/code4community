"use client";

import { useState } from "react";
import { useAuth } from "@/utils/AuthContext";
import { loadCustomClubs } from "@/lib/club-hub/customClubs";
import { loadMeetingDayOverrides } from "@/lib/club-hub/clubMeetingDays";
import { isValidEmail } from "@/lib/email";
import { useClubHubSchool } from "@/lib/club-hub/ClubHubSchoolProvider";

const MEETING_DAY_LABELS = {
  gold: "Gold",
  maroon: "Maroon",
  both: "Gold & Maroon",
  general: "General",
};

const EMPTY_SPONSOR = { name: "", email: "" };

/**
 * @param {{ onCreated?: (name: string) => void, onError?: (message: string) => void }} props
 */
export default function ClubHubCreateClubForm({ onCreated, onError }) {
  const { user } = useAuth();
  const school = useClubHubSchool();
  const [name, setName] = useState("");
  const [meetingDay, setMeetingDay] = useState("general");
  const [sponsors, setSponsors] = useState([{ ...EMPTY_SPONSOR }]);
  const [busy, setBusy] = useState(false);
  const showMeetingDay = school.features.seminar;

  const updateSponsor = (index, field, value) => {
    setSponsors((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user?.getIdToken || busy) return;
    const clubName = name.trim();
    if (!clubName) {
      onError?.("Enter a club name.");
      return;
    }
    const cleaned = sponsors
      .map((sponsor) => ({ name: sponsor.name.trim(), email: sponsor.email.trim() }))
      .filter((sponsor) => sponsor.name || sponsor.email);
    if (cleaned.length === 0 || cleaned.some((sponsor) => !sponsor.name || !isValidEmail(sponsor.email))) {
      onError?.("Each sponsor needs a name and a valid email.");
      return;
    }
    const resolvedDay = showMeetingDay ? meetingDay : "general";
    const dayLabel = MEETING_DAY_LABELS[resolvedDay];
    const confirmed = window.confirm(
      showMeetingDay
        ? `Create ${clubName} as a ${dayLabel} club?`
        : `Create ${clubName}?`,
    );
    if (!confirmed) return;

    setBusy(true);
    onError?.("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/club-hub/admin/custom-clubs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: clubName,
          meetingDay: resolvedDay,
          sponsors: cleaned,
          schoolId: school.schoolId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not create club.");
      await Promise.all([
        loadCustomClubs({ force: true }),
        showMeetingDay ? loadMeetingDayOverrides({ force: true }) : Promise.resolve(),
      ]);
      setName("");
      setMeetingDay("general");
      setSponsors([{ ...EMPTY_SPONSOR }]);
      onCreated?.(clubName);
    } catch (err) {
      onError?.(err.message || "Could not create club.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-md border border-neutral-200 p-4">
      <h3 className="font-semibold text-neutral-900">Add a club</h3>
      <p className="mt-1 text-sm text-neutral-700">
        {showMeetingDay
          ? "Enter the club name, when it meets, and at least one sponsor."
          : "Enter the club name and at least one sponsor."}
      </p>
      <div className={`mt-3 grid gap-3 ${showMeetingDay ? "sm:grid-cols-2" : ""}`}>
        <label className="block text-sm font-medium text-neutral-900" htmlFor="new-club-name">
          Club name
          <input
            id="new-club-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        {showMeetingDay ? (
          <label className="block text-sm font-medium text-neutral-900" htmlFor="new-club-day">
            Meeting day
            <select
              id="new-club-day"
              value={meetingDay}
              onChange={(e) => setMeetingDay(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
            >
              {Object.entries(MEETING_DAY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <fieldset className="mt-3 space-y-2">
        <legend className="text-sm font-medium text-neutral-900">Sponsors</legend>
        {sponsors.map((sponsor, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-2">
            <label className="sr-only" htmlFor={`new-club-sponsor-name-${index}`}>
              Sponsor name
            </label>
            <input
              id={`new-club-sponsor-name-${index}`}
              value={sponsor.name}
              onChange={(e) => updateSponsor(index, "name", e.target.value)}
              placeholder="Sponsor name"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            <label className="sr-only" htmlFor={`new-club-sponsor-email-${index}`}>
              Sponsor email
            </label>
            <input
              id={`new-club-sponsor-email-${index}`}
              type="email"
              value={sponsor.email}
              onChange={(e) => updateSponsor(index, "email", e.target.value)}
              placeholder="Sponsor email"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
        ))}
        <button
          type="button"
          disabled={sponsors.length >= 8}
          onClick={() => setSponsors((rows) => (rows.length >= 8 ? rows : [...rows, { ...EMPTY_SPONSOR }]))}
          className="text-sm font-semibold text-[#5c1417] underline"
        >
          Add another sponsor
        </button>
      </fieldset>
      <button
        type="submit"
        disabled={busy || !user}
        className="mt-3 rounded-md bg-[#5c1417] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Creating…" : "Create club"}
      </button>
    </form>
  );
}
