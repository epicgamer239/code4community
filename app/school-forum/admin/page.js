"use client";

import { useState } from "react";
import CyclesPanel from "@/components/school-forum/CyclesPanel";
import {
  MetricsPanel,
  SafetyQueuePanel,
  StaffPanel,
  StatusBoardPanel,
} from "@/components/school-forum/AdminPanels";
import SchoolForumShell from "@/components/school-forum/SchoolForumShell";
import { TabPanel, Tabs } from "@/components/school-forum/ui";

const PREFIX = "forum-admin";

function AdminDashboard({ overview, user }) {
  const caps = overview.capabilities;
  const tabs = [
    caps.manageCycles && { id: "cycles", label: "Cycles & results" },
    caps.changeStatus && { id: "status", label: "Status board" },
    caps.viewSafetyQueue && { id: "safety", label: "Safety concerns" },
    caps.viewMetrics && { id: "metrics", label: "Metrics" },
    caps.manageStaff && { id: "team", label: "Team" },
  ].filter(Boolean);
  const [tab, setTab] = useState(tabs[0]?.id);

  return (
    <>
      <Tabs label="Admin sections" tabs={tabs} active={tab} onChange={setTab} idPrefix={PREFIX} />
      <TabPanel idPrefix={PREFIX} id="cycles" active={tab}>
        <CyclesPanel user={user} canManage />
      </TabPanel>
      <TabPanel idPrefix={PREFIX} id="status" active={tab}>
        <StatusBoardPanel user={user} />
      </TabPanel>
      <TabPanel idPrefix={PREFIX} id="safety" active={tab}>
        <SafetyQueuePanel user={user} />
      </TabPanel>
      <TabPanel idPrefix={PREFIX} id="metrics" active={tab}>
        <MetricsPanel user={user} />
      </TabPanel>
      <TabPanel idPrefix={PREFIX} id="team" active={tab}>
        <StaffPanel user={user} overview={overview} />
      </TabPanel>
    </>
  );
}

export default function SchoolForumAdminPage() {
  return (
    <SchoolForumShell
      title="Forum admin"
      intro="Run voting cycles, respond to concerns, handle safety reports, and track how the pilot is going."
      requires={(caps) => caps.manageCycles || caps.manageStaff}
    >
      {(props) => <AdminDashboard {...props} />}
    </SchoolForumShell>
  );
}
