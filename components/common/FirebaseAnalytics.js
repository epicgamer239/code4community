"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import app from "@/firebase";
import { initFirebaseAnalytics, logAnalyticsPageView } from "@/lib/firebase/analytics";
import { getFirebaseMeasurementId } from "@/lib/firebase/config";

function FirebaseAnalyticsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!getFirebaseMeasurementId()) return;
    void initFirebaseAnalytics(app);
  }, []);

  useEffect(() => {
    if (!getFirebaseMeasurementId()) return;
    const query = searchParams?.toString();
    const path = query ? `${pathname}?${query}` : pathname;
    void (async () => {
      await initFirebaseAnalytics(app);
      await logAnalyticsPageView(path);
    })();
  }, [pathname, searchParams]);

  return null;
}

/** Records SPA route changes as Firebase Analytics page views when measurement ID is configured. */
export default function FirebaseAnalytics() {
  if (!getFirebaseMeasurementId()) return null;
  return <FirebaseAnalyticsInner />;
}
