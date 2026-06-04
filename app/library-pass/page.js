"use client";

import { useAuth } from "@/utils/AuthContext";
import { AppPageLayout } from "@/components/common/AppPageLayout";
import { isAdminUser, isTeacherOrAdmin } from "@/utils/authorization";
import { firestore } from "@/firebase";
import StudentDashboard from "./StudentDashboard";
import AdminDashboard from "./AdminDashboard";

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
          <div className="text-lg text-gray-600">Loading…</div>
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

  return (
    <AppPageLayout>
      {isStaff ? (
        <div>
          <div className="border-b border-gray-200 bg-indigo-50 px-4 py-2 text-center text-sm text-indigo-900">
            Admin view — students see only today&apos;s four blocks and the Get pass button.
          </div>
          <AdminDashboard />
        </div>
      ) : (
        <StudentDashboard />
      )}
    </AppPageLayout>
  );
}
