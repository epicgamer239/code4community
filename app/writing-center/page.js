"use client";

import { useAuth } from "@/utils/AuthContext";
import { normalizeWritingCenterRole } from "@/lib/profile";
import { AppPageLayout } from "@/components/common/AppPageLayout";
import StudentDashboard from "./StudentDashboard";
import TutorDashboard from "./TutorDashboard";
import AdminDashboard from "./AdminDashboard";
import { firestore } from "@/firebase";

export default function WritingCenterPage() {
  const { user, userData, loading } = useAuth();
  const userRole = normalizeWritingCenterRole(userData?.role);
  const firebaseError = !firestore;

  if (loading) {
    return (
      <AppPageLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading...</div>
        </div>
      </AppPageLayout>
    );
  }

  if (firebaseError) {
    return (
      <AppPageLayout>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <h1 className="text-2xl font-bold mb-4">Writing Center</h1>
            <p className="text-gray-600 mb-4">
              The Writing Center tool requires Firebase authentication to function properly.
            </p>
            <a
              href="/login"
              className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Sign In
            </a>
          </div>
        </div>
      </AppPageLayout>
    );
  }

  if (!user) {
    return (
      <AppPageLayout>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <h1 className="text-2xl font-bold mb-4">Writing Center</h1>
            <p className="text-gray-600 mb-4">
              Please sign in to access the Writing Center.
            </p>
            <a
              href="/login"
              className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Sign In
            </a>
          </div>
        </div>
      </AppPageLayout>
    );
  }

  const isAdminView = userRole === "ADMIN" || userRole === "TEACHER";

  return (
    <AppPageLayout>
      {userRole === "STUDENT" && <StudentDashboard />}
      {userRole === "TUTOR" && <TutorDashboard />}
      {isAdminView && <AdminDashboard />}
      {!["STUDENT", "TUTOR", "ADMIN", "TEACHER"].includes(userRole) && (
        <div className="px-6 py-8 text-center text-gray-600">
          <p>Unknown role: {userRole}. Ask an admin to set your Writing Center role in Firestore.</p>
        </div>
      )}
    </AppPageLayout>
  );
}
