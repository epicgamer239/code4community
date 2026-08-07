"use client";

import { getSessionReportUrl } from "@/lib/writing-center/sessionReport";

export function SessionReportLink({ session, label = "View session report (PDF)" }) {
  const url = getSessionReportUrl(session);
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block text-sm font-medium text-indigo-600 hover:text-indigo-900"
    >
      {label}
    </a>
  );
}
