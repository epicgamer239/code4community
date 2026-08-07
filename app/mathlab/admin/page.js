"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardTopBar from "@/components/layout/DashboardTopBar";
import MathLabSidebar from "@/components/mathlab/MathLabSidebar";
import MathLabAdminDashboard from "@/components/mathlab/MathLabAdminDashboard";
import MathLabLoginPrompt from "@/components/mathlab/MathLabLoginPrompt";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { useAuth } from "@/utils/AuthContext";
import { isAdminUser } from "@/utils/authorization";

function MathLabAdminPageContent() {
  const router = useRouter();
  const { user, userData, loading } = useAuth();
  const isAdmin = user && userData && isAdminUser(userData.role, user.email);

  useEffect(() => {
    if (!loading && user && userData && !isAdmin) {
      router.replace("/mathlab");
    }
  }, [loading, user, userData, isAdmin, router]);

  if (!loading && !user) {
    return (
      <MathLabLoginPrompt
        redirectTo="/mathlab/admin"
        title="Sign in to manage the team"
        description="Only admins can add or remove tutors and appointed admins."
      />
    );
  }

  if (loading || (user && !userData)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardTopBar title="BRHS Math Lab" />
      <Suspense fallback={null}>
        <MathLabSidebar />
      </Suspense>
      <div className="ml-0 md:ml-16 px-6 py-8 pb-16 md:pb-8">
        <MathLabAdminDashboard />
      </div>
    </div>
  );
}

export default function MathLabAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <MathLabAdminPageContent />
    </Suspense>
  );
}
