import { auth } from "@/firebase";
import {
  TUTOR_ALERT_MATHLAB,
  TUTOR_ALERT_WRITING_CENTER,
} from "@/lib/tutorAlerts/services";

/**
 * Best-effort web push fan-out after a student creates a request.
 * Failures are swallowed so request creation never depends on push.
 *
 * @param {{
 *   service: import("@/lib/tutorAlerts/services").TutorAlertService,
 *   title: string,
 *   body: string,
 *   href: string,
 *   tag?: string,
 * }} opts
 */
export async function requestTutorPushNotify(opts) {
  try {
    if (
      opts.service !== TUTOR_ALERT_MATHLAB &&
      opts.service !== TUTOR_ALERT_WRITING_CENTER
    ) {
      return;
    }
    const user = auth?.currentUser;
    if (!user) return;
    const token = await user.getIdToken();
    await fetch("/api/tutor-alerts/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        service: opts.service,
        title: opts.title,
        body: opts.body,
        href: opts.href,
        tag: opts.tag,
      }),
    });
  } catch {
    /* ignore */
  }
}
