"use client";

import { Suspense, useState, useLayoutEffect, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AppPageLayout, CenteredMain } from "@/components/common/AppPageLayout";
import FullPageLoading from "@/components/common/FullPageLoading";
import { useAuth } from "@/utils/AuthContext";
import { lookupBroadRunName } from "@/lib/club-hub/broadRunRoster";
import { normalizeEmail } from "@/lib/email";
import { auth, createUserWithEmailAndPassword, updateProfile } from "@/firebase";
import { fetchSignupEmailAllowlist } from "@/lib/auth/signupAllowlist";
import {
  isSignupEmailAllowed,
  signupEmailRejectionMessage,
} from "@/lib/auth/signupEmailPolicy";

async function applyRosterDisplayName(firebaseUser) {
  const rosterName = lookupBroadRunName(normalizeEmail(firebaseUser.email));
  if (rosterName) {
    await updateProfile(firebaseUser, { displayName: rosterName });
  }
}

function safeRedirectTarget() {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("redirectTo");
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return null;
}

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const redirectRaw = searchParams.get("redirectTo");
  const loginHref =
    redirectRaw && redirectRaw.startsWith("/") && !redirectRaw.startsWith("//")
      ? `/login?redirectTo=${encodeURIComponent(redirectRaw)}`
      : "/login";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [externalAllowlist, setExternalAllowlist] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const map = await fetchSignupEmailAllowlist();
        if (!cancelled) setExternalAllowlist(map);
      } catch {
        if (!cancelled) setExternalAllowlist({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    document.title = "Code4Community | Sign up";
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(safeRedirectTarget() || "/");
    }
  }, [user, authLoading, router]);

  const ensureSignupEmailAllowed = (address) => {
    if (externalAllowlist === null) {
      setError("Still loading signup rules. Try again in a moment.");
      return false;
    }
    const normalized = normalizeEmail(address);
    if (!isSignupEmailAllowed(normalized, externalAllowlist)) {
      setError(signupEmailRejectionMessage(normalized, externalAllowlist));
      return false;
    }
    return true;
  };

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setError("");
    if (!ensureSignupEmailAllowed(email)) return;
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(
        auth,
        normalizeEmail(email),
        password,
      );
      await applyRosterDisplayName(newUser);
      router.replace(safeRedirectTarget() || "/");
      router.refresh();
    } catch (err) {
      const msg =
        err.code === "auth/email-already-in-use"
          ? "An account with this email already exists."
          : err.code === "auth/weak-password"
          ? "Password should be at least 6 characters."
          : err.code === "auth/invalid-email"
          ? "Please enter a valid email."
          : err.message || "Sign up failed.";
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
          <h1 className="text-xl font-bold text-foreground text-center mb-1">Get started</h1>
          <p className="text-muted-foreground text-center text-sm mb-5">
            Sign up with your <strong>@lcps.org</strong> school email to get started.
          </p>

          <form onSubmit={handleEmailSignup} className="space-y-3">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@lcps.org"
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete="new-password"
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
              {password.length > 0 && (() => {
                const p = password;
                const len = p.length >= 6;
                const hasLetter = /[a-zA-Z]/.test(p);
                const hasNumber = /[0-9]/.test(p);
                const hasSpecial = /[^a-zA-Z0-9]/.test(p);
                const strength = !len ? 0 : hasLetter && hasNumber && hasSpecial ? 3 : hasLetter && hasNumber ? 2 : 1;
                const messages = ["Too short (at least 6 characters)", "Add letters and numbers", "Add a symbol for stronger password", "Strong password"];
                const colors = strength === 0 ? ["bg-red-500", "bg-muted", "bg-muted"] : strength === 1 ? ["bg-red-500", "bg-amber-400", "bg-muted"] : strength === 2 ? ["bg-red-500", "bg-amber-400", "bg-emerald-500"] : ["bg-emerald-500", "bg-emerald-500", "bg-emerald-500"];
                return (
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex gap-1">
                      {colors.map((c, i) => <div key={i} className={`w-2 h-2 rounded-full ${c}`} />)}
                    </div>
                    <span className="text-xs text-muted-foreground">{messages[strength]}</span>
                  </div>
                );
              })()}
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Use a personal password for this site — not your LCPS / school login password.
              </p>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 pr-10 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0 rounded p-0.5"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
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
              {loading ? "Creating account…" : "Sign up"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            By signing up you agree to our{" "}
            <Link href="/terms" className="text-primary hover:underline">
              terms of service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              privacy policy
            </Link>
            .
          </p>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href={loginHref} className="text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </CenteredMain>
    </AppPageLayout>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<FullPageLoading />}>
      <SignupPageContent />
    </Suspense>
  );
}