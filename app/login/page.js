"use client";

import { Suspense, useState, useLayoutEffect, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AppPageLayout, CenteredMain } from "@/components/common/AppPageLayout";
import FullPageLoading from "@/components/common/FullPageLoading";
import { useAuth } from "@/utils/AuthContext";
import { auth, signInWithEmailAndPassword } from "@/firebase";
import { normalizeEmail } from "@/lib/email";

function safeRedirectTarget() {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("redirectTo");
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return null;
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const redirectRaw = searchParams.get("redirectTo");
  const signupHref =
    redirectRaw && redirectRaw.startsWith("/") && !redirectRaw.startsWith("//")
      ? `/signup?redirectTo=${encodeURIComponent(redirectRaw)}`
      : "/signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => {
    document.title = "Code4Community | Log in";
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      const next = safeRedirectTarget();
      router.replace(next || "/");
    }
  }, [user, authLoading, router]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
      const next = safeRedirectTarget();
      router.push(next || "/");
      router.refresh();
    } catch (err) {
      const msg = err.code === "auth/invalid-credential" || err.code === "auth/wrong-password"
        ? "Invalid email or password."
        : err.code === "auth/user-not-found"
        ? "No account found with this email."
        : err.message || "Sign in failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <FullPageLoading />;
  }

  if (user) {
    return null;
  }

  return (
    <AppPageLayout>
      <CenteredMain className="py-8 min-h-0">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-4">
            <Image src="/brand/c4c.png" alt="Code4Community" width={48} height={48} />
          </div>
          <h1 className="text-xl font-bold text-foreground text-center mb-1">Log in</h1>
          <p className="text-muted-foreground text-center text-sm mb-5">
            Sign in to your account to continue.
          </p>

          <form onSubmit={handleEmailLogin} className="space-y-3">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot your password? Reset it
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 pr-10 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0 rounded p-0.5"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-foreground text-background font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? "Signing in…" : "Log in"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href={signupHref} className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </CenteredMain>
    </AppPageLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<FullPageLoading />}>
      <LoginPageContent />
    </Suspense>
  );
}