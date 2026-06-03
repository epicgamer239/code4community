"use client";

import { useLayoutEffect, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AppPageLayout, CenteredMain } from "@/components/common/AppPageLayout";
import FullPageLoading from "@/components/common/FullPageLoading";
import { useAuth } from "@/utils/AuthContext";
import { auth, sendEmailVerification } from "@/firebase";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [resending, setResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [notVerifiedMessage, setNotVerifiedMessage] = useState(null);

  useLayoutEffect(() => {
    document.title = "Code4Community | Verify your email";
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.emailVerified) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  const handleResend = async () => {
    if (!user) return;
    setResending(true);
    setResendSent(false);
    try {
      const continueUrl = typeof window !== "undefined" ? `${window.location.origin}/auth/verify-email` : "";
      await sendEmailVerification(user, {
        handleCodeInApp: true,
        ...(continueUrl && { url: continueUrl }),
      });
      setResendSent(true);
    } catch (err) {
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerified = async () => {
    if (!user) return;
    setNotVerifiedMessage(null);
    setChecking(true);
    try {
      await user.reload();
      const updated = auth.currentUser;
      if (updated?.emailVerified) {
        router.replace("/");
      } else {
        setNotVerifiedMessage("Our systems do not detect that you have verified your email yet. Please click the link in the verification email and try again.");
      }
    } finally {
      setChecking(false);
    }
  };

  if (authLoading || !user) {
    return <FullPageLoading />;
  }

  if (user.emailVerified) {
    return null;
  }

  return (
    <AppPageLayout>
      <CenteredMain className="py-8 min-h-0">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-6">
            <Image src="/c4c.png" alt="Code4Community" width={56} height={56} />
          </div>
          <h1 className="text-2xl font-bold text-foreground text-center mb-2">
            Waiting for email verification
          </h1>
          <p className="text-muted-foreground text-center text-sm mb-8">
            You’re signed in. Verify the email we sent to <strong className="text-foreground">{user.email}</strong> to unlock all signed-in features.
          </p>

          <div className="rounded-xl border border-border bg-muted/30 p-6 mb-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">How to verify</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Open your email inbox (and spam folder if you don’t see it).</li>
              <li>Find the message from Code4Community with the subject “Verify your email”.</li>
              <li>Click the verification link in that email.</li>
              <li>Come back here and click “I’ve verified my email” below.</li>
            </ol>
          </div>

          <div className="space-y-3">
            {notVerifiedMessage && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
                {notVerifiedMessage}
              </div>
            )}
            <button
              type="button"
              onClick={handleCheckVerified}
              disabled={checking}
              className="w-full py-3 px-4 bg-foreground text-background font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {checking ? "Checking…" : "I've verified my email"}
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="w-full py-3 px-4 border border-border rounded-lg bg-background text-foreground font-medium hover:bg-muted/50 disabled:opacity-50 transition-colors"
            >
              {resending ? "Sending…" : "Resend verification email"}
            </button>
            {resendSent && (
              <p className="text-sm text-center text-green-600 dark:text-green-400">
                Verification email sent. Check your inbox.
              </p>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Need help?{" "}
            <Link href="/contact" className="text-primary hover:underline">
              Contact us
            </Link>
          </p>
        </div>
      </CenteredMain>
    </AppPageLayout>
  );
}
