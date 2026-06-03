"use client";

export function WritingCenterPreviewBanner({ role, onBack }) {
  const label = role === "tutor" ? "Tutor" : "Student";
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-amber-950">
        <span className="font-semibold">Admin preview — {label} view.</span> Layout and controls only;
        {role === "student"
          ? " session list uses your admin account, not a real student’s data."
          : " actions may affect real sessions if you click them."}
      </p>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-md border border-amber-400 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
        >
          Back to admin
        </button>
      )}
    </div>
  );
}
