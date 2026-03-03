"use client";

import { useLayoutEffect } from "react";
import DashboardTopBar from "../../components/DashboardTopBar";
import Footer from "../../components/Footer";

export default function DashboardPage() {
  useLayoutEffect(() => {
    document.title = "Code4Community | Dashboard";
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardTopBar title="Code4Community" showNavLinks={true} />

      <div className="flex-1 container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground mb-8">
            Manage your Code4Community services and account in one place.
          </p>
          <div className="rounded-lg border border-border bg-muted/30 p-10 text-center">
            <p className="text-foreground font-medium mb-2">No services currently activated</p>
            <p className="text-muted-foreground text-sm mb-6">
              Your account is set up. When you activate a service—such as donor management, volunteer platforms, or custom dashboards—it will appear here.
            </p>
            <p className="text-muted-foreground text-sm">
              To activate a service or discuss your needs, contact us at{" "}
              <a href="mailto:brhsc4c@gmail.com" className="text-primary hover:underline">
                brhsc4c@gmail.com
              </a>
              . We&apos;ll get back to you shortly.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
