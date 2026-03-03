"use client";

import { useState, useLayoutEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import DashboardTopBar from "../../components/DashboardTopBar";
import Footer from "../../components/Footer";
import { auth, sendPasswordResetEmail } from "../../firebase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => {
    document.title = "Code4Community | Reset password";
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email.");
      } else {
        setError(err.message || "Failed to send reset email.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardTopBar title="Code4Community" showNavLinks={true} />

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Image src="/c4c.png" alt="Code4Community" width={56} height={56} />
          </div>
          <h1 className="text-2xl font-bold text-foreground text-center mb-2">Reset password</h1>
          <p className="text-muted-foreground text-center text-sm mb-8">
            Enter your email and we’ll send you a link to reset your password.
          </p>

          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-foreground text-center">
                Check your inbox. We’ve sent a password reset link to <strong>{email}</strong>.
              </p>
              <p className="text-sm text-muted-foreground text-center">
                <Link href="/login" className="text-primary hover:underline">
                  Back to log in
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
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
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline">
              Back to log in
            </Link>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
