"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/utils/AuthContext";
import DashboardTopBar from "@/components/layout/DashboardTopBar";
import { AppPageLayout } from "@/components/common/AppPageLayout";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { isAdminUser, isTeacherOrAdmin } from "@/utils/authorization";
import { firestore } from "@/firebase";
import StudentDashboard from "@/components/library-pass/StudentDashboard";
import AdminDashboard from "@/components/library-pass/AdminDashboard";
import LibraryPassSidebar from "@/components/library-pass/LibraryPassSidebar";

function StaffLibraryPass() {
  const searchParams = useSearchParams();
  const view = searchParams?.get("view") === "limits" ? "limits" : "active";

  return (
    <div className="min-h-screen bg-background">
      <DashboardTopBar title="Library Pass" />
      <Suspense fallback={null}>
        <LibraryPassSidebar />
      </Suspense>
      <div className="ml-0 md:ml-16 px-6 py-8 pb-16 md:pb-8">
        <AdminDashboard view={view} />
      </div>
    </div>
  );
}

export default function LibraryPassPage() {
  const { user, userData, loading } = useAuth();
  const firebaseError = !firestore;
  const isStaff =
    user &&
    userData &&
    (isAdminUser(userData.role, user.email) || isTeacherOrAdmin(userData.role));

  if (loading) {
    return (
      <AppPageLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingSpinner />
        </div>
      </AppPageLayout>
    );
  }

  if (firebaseError) {
    return (
      <AppPageLayout>
        <div className="max-w-lg mx-auto px-6 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Library Pass</h1>
          <p className="text-gray-600 mb-4">
            Library Pass requires Firebase. Configure credentials to use this tool.
          </p>
          <a
            href="/login"
            className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Sign In
          </a>
        </div>
      </AppPageLayout>
    );
  }

  if (!user) {
    return (
      <AppPageLayout>
        <div className="max-w-lg mx-auto px-6 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Library Pass</h1>
          <p className="text-gray-600 mb-4">Sign in with your school account to get a pass.</p>
          <a
            href={`/login?redirectTo=${encodeURIComponent("/library-pass")}`}
            className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Sign In
          </a>
        </div>
      </AppPageLayout>
    );
  }

  if (isStaff) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-background flex items-center justify-center">
            <LoadingSpinner />
          </div>
        }
      >
        <StaffLibraryPass />
      </Suspense>
    );
  }

  return (
    <AppPageLayout>
      <StudentDashboard />
    </AppPageLayout>
  );
}
