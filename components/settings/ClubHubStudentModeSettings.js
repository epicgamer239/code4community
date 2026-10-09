"use client";

import { useState } from "react";
import { useAuth } from "@/utils/AuthContext";
import {
  canOfferClubHubStudentMode,
  isClubHubStudentModeActive,
} from "@/lib/club-hub/clubHubStudentMode";
import { setClubHubStudentMode } from "@/lib/club-hub/clubHubStudentModeClient";

const cardClass =
  "rounded-xl border border-border bg-background p-6 mb-6 shadow-sm";

export default function ClubHubStudentModeSettings() {
  const { user, userData } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  if (!user || !canOfferClubHubStudentMode(user.email)) return null;

  const enabled = isClubHubStudentModeActive(userData, user.email);

  const onToggle = async () => {
    if (!user?.uid || saving) return;
    setMessage(null);
    setSaving(true);
    const next = !enabled;
    try {
      await setClubHubStudentMode(user.uid, next);
      window.dispatchEvent(
        new CustomEvent("userRoleChanged", { detail: { userId: user.uid } }),
      );
      setMessage({
        type: "success",
        text: next
          ? "Student mode on — club pages show Join instead of Edit."
          : "Student mode off — club edit access restored.",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Could not update Club Hub student mode.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={cardClass} aria-labelledby="club-hub-student-mode-heading">
      <h2 id="club-hub-student-mode-heading" className="text-lg font-semibold text-foreground mb-1">
        Club Hub student mode
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Turn this on to join clubs as a student. Club pages show{" "}
        <strong className="font-medium text-foreground">Join club</strong> instead of{" "}
        <strong className="font-medium text-foreground">Edit page</strong>. Club Hub admin tools
        still work.
      </p>
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={enabled}
          disabled={saving}
          onChange={() => void onToggle()}
          className="h-4 w-4 rounded border-border"
        />
        <span className="text-sm font-medium text-foreground">
          {saving ? "Saving…" : "Use Club Hub as a student"}
        </span>
      </label>
      {message ? (
        <p
          className={`mt-3 text-sm ${message.type === "error" ? "text-red-700" : "text-green-800"}`}
          role="status"
        >
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
