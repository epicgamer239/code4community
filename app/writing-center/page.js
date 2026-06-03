"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/utils/AuthContext";
import { AppPageLayout } from "@/components/common/AppPageLayout";
import StudentDashboard from "./StudentDashboard";
import TutorDashboard from "./TutorDashboard";
import AdminDashboard from "./AdminDashboard";
import { firestore } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function WritingCenterPage() {
  const { user, loading } = useAuth();
  const [userRole, setUserRole] = useState('STUDENT');
  const [roleLoading, setRoleLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState(false);

  useEffect(() => {
    if (!firestore) {
      setFirebaseError(true);
      setRoleLoading(false);
      return;
    }

    if (user) {
      fetchUserRole();
    } else {
      setRoleLoading(false);
    }
  }, [user]);

  const fetchUserRole = async () => {
    try {
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = (userData.role || 'STUDENT').toUpperCase();
        console.log('WritingCenterPage - User role from Firestore:', userData.role, '->', role);
        setUserRole(role);
      } else {
        console.log('WritingCenterPage - No user document found, defaulting to STUDENT');
        setUserRole('STUDENT');
      }
    } catch (error) {
      console.error('Failed to fetch user role:', error);
      setUserRole('STUDENT');
    } finally {
      setRoleLoading(false);
    }
  };

  if (loading || roleLoading) {
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
