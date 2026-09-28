"use client";

export default function FullPageLoading({ message = "Loading…" }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <p className="text-muted-foreground" role="status">
        {message}
      </p>
    </div>
  );
}

