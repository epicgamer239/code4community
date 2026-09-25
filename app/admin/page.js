"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppPageLayout, ContainerMain } from "@/components/common/AppPageLayout";
import FullPageLoading from "@/components/common/FullPageLoading";
import SignupAllowlistPanel from "@/components/admin/SignupAllowlistPanel";
import { useAuth } from "@/utils/AuthContext";
import { isSiteAdminUser } from "@/lib/auth/productAdmins";

export default function SiteAdminPage() {
  const router = useRouter();
  const { user, userData, loading } = useAuth();
  const isAdmin = Boolean(user && userData && isSiteAdminUser(userData, user.email));

  useEffect(() => {
    if (!loading && user && userData && !isAdmin) {
      router.replace("/");
    }
  }, [loading, user, userData, isAdmin, router]);

  if (loading || (user && !userData)) {
    return <FullPageLoading />;
  }

  if (!user) {
    return (
      <AppPageLayout>
        <ContainerMain className="py-12 text-center">
          <p className="text-sm text-muted-foreground">Sign in with a site admin account.</p>
          <Link href="/login?redirectTo=%2Fadmin" className="mt-3 inline-block text-primary hover:underline">
            Log in
          </Link>
        </ContainerMain>
      </AppPageLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AppPageLayout>
      <ContainerMain className="max-w-2xl py-10">
        <h1 className="text-2xl font-bold text-foreground">Site admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tools for Code4Community super admins (team management lives under{" "}
          <Link href="/mathlab/admin" className="text-primary hover:underline">
            Math Lab admin
          </Link>
          ).
        </p>
        <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm">
          <SignupAllowlistPanel />
        </div>
      </ContainerMain>
    </AppPageLayout>
  );
}
