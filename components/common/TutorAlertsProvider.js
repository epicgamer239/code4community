"use client";

import { useEffect } from "react";
import { useAuth } from "@/utils/AuthContext";
import {
  useMathLabIncomingAlerts,
  useWritingCenterIncomingAlerts,
} from "@/lib/tutorAlerts/useTutorIncomingAlerts";
import { isTutorOrHigher } from "@/utils/authorization";
import { hasWritingCenterTutorAccess } from "@/lib/tutorServices";
import {
  isAcceptingTutoring,
  TUTOR_ALERT_MATHLAB,
  TUTOR_ALERT_WRITING_CENTER,
} from "@/lib/tutorAlerts/services";
import { unlockTutorAlertAudio } from "@/lib/tutorAlerts/sound";

/**
 * Keeps Math Lab / Writing Center request listeners alive for the whole logged-in
 * session (any route), so sound + browser alerts still fire when Accepting is on
 * but the tutor is not on the dashboard.
 */
export default function TutorAlertsProvider({ children }) {
  const { user, userData } = useAuth();
  const loggedIn = Boolean(user);

  // Match Math Lab page access (tutors + teachers + admins), not only mathLabRole===tutor.
  const mathLabTutorSurface = Boolean(
    loggedIn &&
      userData &&
      isTutorOrHigher(userData.role, userData.mathLabRole),
  );

  const writingCenterTutorSurface = Boolean(
    loggedIn &&
      userData &&
      (hasWritingCenterTutorAccess(userData) ||
        userData.role === "teacher" ||
        userData.role === "admin" ||
        userData.writingCenterAdmin === true),
  );

  const needsAudioUnlock = Boolean(
    (mathLabTutorSurface && isAcceptingTutoring(TUTOR_ALERT_MATHLAB, userData)) ||
      (writingCenterTutorSurface &&
        isAcceptingTutoring(TUTOR_ALERT_WRITING_CENTER, userData)),
  );

  // Chrome blocks sound until a gesture in this tab session — unlock on first click/key.
  useEffect(() => {
    if (!needsAudioUnlock || typeof window === "undefined") return undefined;
    let done = false;
    const unlock = () => {
      if (done) return;
      done = true;
      unlockTutorAlertAudio();
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);
    return () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
  }, [needsAudioUnlock]);

  useMathLabIncomingAlerts({
    enabled: mathLabTutorSurface,
    userData,
  });

  useWritingCenterIncomingAlerts({
    enabled: writingCenterTutorSurface,
    userData,
  });

  return children;
}
