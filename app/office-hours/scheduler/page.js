"use client";

import { Suspense } from "react";
import DashboardTopBar from "@/components/layout/DashboardTopBar";
import OfficeHoursSidebar from "@/components/office-hours/OfficeHoursSidebar";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import SchedulerStudentView from "@/components/mathlab/SchedulerStudentView";
import { OFFICE_HOURS_SCHEDULER } from "@/lib/mathlab/schedulerConfig";
import { useAuth } from "@/utils/AuthContext";

function SchedulerPageContent() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return <SchedulerStudentView />;
}

export default function OfficeHoursSchedulerPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardTopBar title={OFFICE_HOURS_SCHEDULER.pageTitle} />
      <Suspense fallback={null}>
        <OfficeHoursSidebar />
      </Suspense>
      <div className="ml-0 md:ml-16 px-4 py-8 pb-20 md:pb-8 bg-[#fafafa] min-h-screen">
        <Suspense
          fallback={
            <div className="min-h-[40vh] flex items-center justify-center">
              <LoadingSpinner />
            </div>
          }
        >
          <SchedulerPageContent />
        </Suspense>
      </div>
    </div>
  );
}
