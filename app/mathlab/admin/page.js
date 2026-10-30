"use client";

import { Suspense } from "react";
import MathLabPageShell from "@/components/mathlab/MathLabPageShell";
import MathLabAdminDashboard from "@/components/mathlab/MathLabAdminDashboard";
import MathLabLoginPrompt from "@/components/mathlab/MathLabLoginPrompt";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { useAuth } from "@/utils/AuthContext";
import { isMathLabAdminUser } from "@/lib/auth/productAdmins";
import { useRequireAccess } from "@/hooks/useRequireAccess";

function MathLabAdminPageContent() {
  const { user, userData, loading } = useAuth();
  const isAdmin = Boolean(user && userData && isMathLabAdminUser(userData, user.email));

  useRequireAccess({
    loading,
    user,
    userData,
    allowed: isAdmin,
    redirectTo: "/mathlab",
  });

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
    <MathLabPageShell contentClassName="ml-0 md:ml-16 px-6 py-8 pb-16 md:pb-8">
      <MathLabAdminDashboard />
    </MathLabPageShell>
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
