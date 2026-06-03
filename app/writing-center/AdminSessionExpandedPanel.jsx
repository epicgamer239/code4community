"use client";

import { isAsyncFormSession } from "@/lib/writingCenterForm";
import { getSessionReportUrl } from "@/lib/writingCenterSessionReport";

const linkClass = "font-medium text-indigo-600 hover:text-indigo-900";

function TutorReceiptLine({ session }) {
  const url = getSessionReportUrl(session);
  return (
    <p className="m-0">
      <span className="font-medium text-gray-700">Tutor Reciept:</span>{" "}
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className={linkClass}>
          View session reciept (PDF)
        </a>
      ) : (
        <span className="text-gray-600">Not submitted yet</span>
      )}
    </p>
  );
}

/** Admin Sessions tab — expanded row details (async / in-person). */
export function AdminSessionExpandedPanel({ session, formResponseUrl }) {
  if (isAsyncFormSession(session)) {
    return (
      <div className="flex flex-col items-start gap-2">
        {formResponseUrl && (
          <p className="m-0">
            <span className="font-medium text-gray-700">Student Response:</span>{" "}
            <a
              href={formResponseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              View in Google Forms
            </a>
          </p>
        )}
        <TutorReceiptLine session={session} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <TutorReceiptLine session={session} />
    </div>
  );
}
