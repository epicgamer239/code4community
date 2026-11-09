"use client";

import { useState } from "react";
import { useAuth } from "@/utils/AuthContext";
import { setAcceptingTutoring } from "@/lib/tutorAlerts/acceptingTutoringClient";
import { isAcceptingTutoring } from "@/lib/tutorAlerts/services";
import { ensureTutorNotificationPermission } from "@/lib/tutorAlerts/browserNotify";
import { unlockTutorAlertAudio, playTutorAlertSound } from "@/lib/tutorAlerts/sound";

/**
 * @param {{
 *   service: import("@/lib/tutorAlerts/services").TutorAlertService,
 *   className?: string,
 * }} props
 */
export default function AcceptingTutoringToggle({ service, className = "" }) {
  const { user, userData } = useAuth();
  const accepting = isAcceptingTutoring(service, userData);
  const [busy, setBusy] = useState(false);

  const onToggle = async () => {
    if (!user?.uid || busy) return;
    setBusy(true);
    const next = !accepting;
    try {
      await unlockTutorAlertAudio();
      if (next) {
        await ensureTutorNotificationPermission();
        playTutorAlertSound();
      }
      await setAcceptingTutoring(user.uid, service, next);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("userRoleChanged", { detail: { userId: user.uid } }),
        );
      }
    } catch {
      /* ignore — toggle stays on previous state until refresh */
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={accepting}
      aria-label="Accepting tutoring"
      disabled={busy || !user?.uid}
      onClick={onToggle}
      className={`inline-flex items-center gap-2.5 text-sm font-medium text-foreground disabled:opacity-60 ${className}`}
    >
      <span>Accepting tutoring</span>
      <span
        aria-hidden
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${
          accepting ? "bg-emerald-600" : "bg-neutral-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
            accepting ? "left-[1.125rem]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}
