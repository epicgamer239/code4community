"use client";

import { useLayoutEffect, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AppPageLayout, CenteredMain } from "@/components/common/AppPageLayout";
import { auth, applyActionCode } from "@/firebase";

export default function AuthVerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get("oobCode");
  const mode = searchParams.get("mode");
  const hasInvalidLink = mode !== "verifyEmail" || !oobCode;
  const [status, setStatus] = useState(hasInvalidLink ? "invalid" : "checking"); // 'checking' | 'success' | 'expired' | 'invalid'
  const [errorMessage, setErrorMessage] = useState(null);

  useLayoutEffect(() => {
    document.title = "Code4Community | Verify email";
  }, []);

  useEffect(() => {
    if (hasInvalidLink || !oobCode) {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await applyActionCode(auth, oobCode);
        if (!cancelled) {
          setStatus("success");
          setTimeout(() => router.replace("/"), 2000);
        }
      } catch (err) {
        if (!cancelled) {
          const expiredOrUsed =
            err.code === "auth/expired-action-code" ||
            err.code === "auth/invalid-action-code";
          if (expiredOrUsed) {
            const currentUser = auth.currentUser;
            if (currentUser) {
              await currentUser.reload();
              if (currentUser.emailVerified) {
                setStatus("success");
                setTimeout(() => router.replace("/"), 2000);
                return;
              }
            }
          }
          setStatus(expiredOrUsed ? "expired" : "invalid");
          setErrorMessage(err.message || null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [hasInvalidLink, oobCode, router]);

  return (
    <AppPageLayout>
      <CenteredMain className="py-12">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-6">
            <Image src="/brand/c4c.png" alt="Code4Community" width={56} height={56} />
          </div>

          {status === "checking" && (
            <p className="text-muted-foreground">Verifying your email…</p>
          )}

          {status === "success" && (
            <>
              <h1 className="text-xl font-bold text-foreground mb-2">Email verified</h1>
              <p className="text-muted-foreground text-sm mb-6">
                Taking you home…
              </p>
            </>
          )}

          {(status === "expired" || status === "invalid") && (
            <>
              <h1 className="text-xl font-bold text-foreground mb-2">
                {status === "expired"
                  ? "Link expired or already used"
                  : "Invalid verification link"}
              </h1>
              <p className="text-muted-foreground text-sm mb-6">
                {status === "expired"
                  ? "Verification links expire after a short time and can only be used once. Request a new link below."
                  : "This link is not valid. You can request a new verification email from the page below."}
              </p>
              <Link
                href="/verify-email"
                className="inline-block w-full py-3 px-4 bg-foreground text-background font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                Go to verify email page (resend link)
              </Link>
              {errorMessage && (
                <p className="mt-4 text-xs text-muted-foreground">{errorMessage}</p>
              )}
            </>
          )}
        </div>
      </CenteredMain>
    </AppPageLayout>
  );
}
