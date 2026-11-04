"use client";

import CyclesPanel from "@/components/school-forum/CyclesPanel";
import ModerationQueue from "@/components/school-forum/ModerationQueue";
import SchoolForumShell from "@/components/school-forum/SchoolForumShell";

export default function SchoolForumModeratePage() {
  return (
    <SchoolForumShell
      title="Moderation"
      intro="Review new posts before they go public. You never see who posted. If a post suggests someone may be harmed, mark it as a safety concern."
      requires={(caps) => caps.moderate}
    >
      {({ user, overview }) => (
        <div className="space-y-10">
          <ModerationQueue user={user} />
          <CyclesPanel user={user} canManage={Boolean(overview.capabilities.manageCycles)} />
        </div>
      )}
    </SchoolForumShell>
  );
}
