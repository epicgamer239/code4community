"use client";

import { useRouter } from "next/navigation";
import MathLabPageShell from "@/components/mathlab/MathLabPageShell";

export default function MathLabTutorBlocked({
  studentRequest,
  onCancelRequest,
}) {
  const router = useRouter();

  return (
    <MathLabPageShell
      contentClassName="flex-1 flex items-center justify-center px-4 py-12 ml-0 md:ml-16 pb-16 md:pb-12"
    >
      <div
        className="max-w-lg w-full card-elevated p-8 rounded-2xl text-center"
        style={{ minHeight: "calc(100vh - 160px)" }}
      >
        <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">Active tutoring request</h1>
        <p className="text-muted-foreground mb-6">
          You have a current request as a student for{" "}
          <span className="font-medium text-foreground">{studentRequest.course}</span>.
          {studentRequest.status === "pending"
            ? " Cancel it to access the tutor dashboard."
            : " Manage it from Math Lab before accepting requests as a tutor."}
        </p>
        <div className="flex flex-col gap-3">
          {studentRequest.status === "pending" && (
            <button
              type="button"
              onClick={onCancelRequest}
              className="w-full py-3 px-4 bg-foreground text-background font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              Cancel request
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push("/mathlab?view=student")}
            className="w-full py-3 px-4 border border-border rounded-lg font-medium hover:bg-muted/50 transition-colors"
          >
            Go to Math Lab
          </button>
        </div>
      </div>
    </MathLabPageShell>
  );
}
