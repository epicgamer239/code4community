"use client";

import { useLayoutEffect, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppPageLayout, ContainerMain } from "@/components/common/AppPageLayout";
import FullPageLoading from "@/components/common/FullPageLoading";
import { useAuth } from "@/utils/AuthContext";
import {
  auth,
  updateProfile,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
} from "@/firebase";

const inputClass =
  "w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";
const labelClass = "block text-sm font-medium text-foreground mb-1.5";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-foreground text-background font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity";
const btnSecondary =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg bg-background text-foreground font-medium hover:bg-muted/50 disabled:opacity-50 transition-colors";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [personalModalOpen, setPersonalModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMessage, setNameMessage] = useState(null);

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);

  useLayoutEffect(() => {
    document.title = "Code4Community | Settings";
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    setName(user.displayName || "");
  }, [user, authLoading, router]);

  const isEmailProvider = user?.providerData?.some((p) => p.providerId === "password") ?? false;

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!user) return;
    setNameMessage(null);
    setNameSaving(true);
    try {
      await updateProfile(user, { displayName: name.trim() || null });
      setNameMessage({ type: "success", text: "Name updated." });
    } catch (err) {
      setNameMessage({ type: "error", text: err.message || "Failed to update name." });
    } finally {
      setNameSaving(false);
    }
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    if (!user || !newEmail.trim()) return;
    setEmailMessage(null);
    if (!isEmailProvider) {
      setEmailMessage({ type: "error", text: "You signed in with Google. Email cannot be changed here." });
      return;
    }
    if (!emailPassword) {
      setEmailMessage({ type: "error", text: "Enter your current password to change email." });
      return;
    }
    setEmailSaving(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, emailPassword);
      await reauthenticateWithCredential(user, cred);
      await updateEmail(user, newEmail.trim());
      setEmailMessage({ type: "success", text: "Email updated. You may need to sign in again." });
      setNewEmail("");
      setEmailPassword("");
    } catch (err) {
      const msg =
        err.code === "auth/invalid-credential"
          ? "Current password is incorrect."
          : err.code === "auth/email-already-in-use"
            ? "That email is already in use."
            : err.message || "Failed to update email.";
      setEmailMessage({ type: "error", text: msg });
    } finally {
      setEmailSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!user) return;
    setPasswordMessage(null);
    if (!isEmailProvider) {
      setPasswordMessage({ type: "error", text: "You signed in with Google. Password is managed by Google." });
      return;
    }
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: "error", text: "Fill in all password fields." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }
    setPasswordSaving(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);
      setPasswordMessage({ type: "success", text: "Password updated." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const msg =
        err.code === "auth/invalid-credential"
          ? "Current password is incorrect."
          : err.code === "auth/weak-password"
            ? "New password should be at least 6 characters."
            : err.message || "Failed to update password.";
      setPasswordMessage({ type: "error", text: msg });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user?.email) return;
    setPasswordMessage(null);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setPasswordMessage({ type: "success", text: "Password reset email sent. Check your inbox." });
    } catch (err) {
      setPasswordMessage({ type: "error", text: err.message || "Failed to send reset email." });
    }
  };

  const openPersonalModal = useCallback(() => {
    if (user) setName(user.displayName || "");
    setNameMessage(null);
    setEmailMessage(null);
    setPasswordMessage(null);
    setNewEmail("");
    setEmailPassword("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPersonalModalOpen(true);
  }, [user]);

  const closePersonalModal = useCallback(() => {
    setPersonalModalOpen(false);
  }, []);

  useEffect(() => {
    if (!personalModalOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closePersonalModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [personalModalOpen, closePersonalModal]);

  if (authLoading || !user) {
    return <FullPageLoading />;
  }

  return (
    <AppPageLayout>
      <ContainerMain className="py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground mb-8">Manage your account details.</p>

          <button
            type="button"
            onClick={openPersonalModal}
            className="group relative flex w-full items-start justify-between gap-4 text-left cursor-pointer rounded-xl border border-border bg-background p-6 mb-6 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/45 hover:bg-muted/35 hover:shadow-md hover:shadow-primary/5 active:translate-y-0 active:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-foreground mb-1">Personal information</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Update your display name, email, and password for this account.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>
                  <span className="text-foreground font-medium">{user.displayName || "Not set"}</span>
                  <span className="mx-1.5 text-border">·</span>
                  <span>{user.email}</span>
                </span>
              </div>
            </div>
            <span
              className="mt-1 shrink-0 rounded-full p-2 text-muted-foreground transition-all duration-200 group-hover:bg-primary/12 group-hover:text-primary group-hover:translate-x-0.5"
              aria-hidden
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </span>
          </button>
        </div>
      </ContainerMain>

      {personalModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closePersonalModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="personal-settings-title"
            className="w-full max-w-md max-h-[min(90vh,720px)] overflow-y-auto rounded-xl border border-border bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between gap-2 border-b border-border bg-background px-5 py-4">
              <h2 id="personal-settings-title" className="text-lg font-semibold text-foreground">
                Personal information
              </h2>
              <button
                type="button"
                onClick={closePersonalModal}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-8">
              {/* Name */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Display name</h3>
                <form onSubmit={handleSaveName} className="space-y-3">
                  <div>
                    <label htmlFor="settings-name" className={labelClass}>
                      Name
                    </label>
                    <input
                      id="settings-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                      placeholder="Your name"
                    />
                  </div>
                  {nameMessage && (
                    <p className={`text-sm ${nameMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
                      {nameMessage.text}
                    </p>
                  )}
                  <button type="submit" disabled={nameSaving} className={btnPrimary}>
                    {nameSaving ? "Saving…" : "Save name"}
                  </button>
                </form>
              </div>

              {/* Email */}
              <div className="border-t border-border pt-3">
                <h3 className="text-sm font-semibold text-foreground mb-3">Email</h3>
                <p className="text-sm text-muted-foreground mb-3">Current: {user.email}</p>
                {isEmailProvider ? (
                  <form onSubmit={handleChangeEmail} className="space-y-3">
                    <div>
                      <label htmlFor="settings-new-email" className={labelClass}>
                        New email
                      </label>
                      <input
                        id="settings-new-email"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className={inputClass}
                        placeholder="new@email.com"
                      />
                    </div>
                    <div>
                      <label htmlFor="settings-email-password" className={labelClass}>
                        Current password
                      </label>
                      <input
                        id="settings-email-password"
                        type="password"
                        value={emailPassword}
                        onChange={(e) => setEmailPassword(e.target.value)}
                        className={inputClass}
                        placeholder="••••••••"
                        autoComplete="current-password"
                      />
                    </div>
                    {emailMessage && (
                      <p className={`text-sm ${emailMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
                        {emailMessage.text}
                      </p>
                    )}
                    <button type="submit" disabled={emailSaving} className={btnPrimary}>
                      {emailSaving ? "Updating…" : "Change email"}
                    </button>
                  </form>
                ) : (
                  <p className="text-sm text-muted-foreground">You signed in with Google. Email is managed by your Google account.</p>
                )}
              </div>

              {/* Password */}
              <div className="border-t border-border pt-3">
                <h3 className="text-sm font-semibold text-foreground mb-3">Password</h3>
                {isEmailProvider ? (
                  <>
                    <form onSubmit={handleChangePassword} className="space-y-3">
                      <div>
                        <label htmlFor="settings-current-password" className={labelClass}>
                          Current password
                        </label>
                        <input
                          id="settings-current-password"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className={inputClass}
                          placeholder="••••••••"
                          autoComplete="current-password"
                        />
                      </div>
                      <div>
                        <label htmlFor="settings-new-password" className={labelClass}>
                          New password
                        </label>
                        <input
                          id="settings-new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className={inputClass}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          minLength={6}
                        />
                      </div>
                      <div>
                        <label htmlFor="settings-confirm-password" className={labelClass}>
                          Confirm new password
                        </label>
                        <input
                          id="settings-confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={inputClass}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          minLength={6}
                        />
                      </div>
                      {passwordMessage && (
                        <p className={`text-sm ${passwordMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
                          {passwordMessage.text}
                        </p>
                      )}
                      <button type="submit" disabled={passwordSaving} className={btnPrimary}>
                        {passwordSaving ? "Updating…" : "Change password"}
                      </button>
                    </form>
                    <p className="text-sm text-muted-foreground mt-4">Or get a password reset link sent to your email:</p>
                    <button type="button" onClick={handleSendPasswordReset} className={`${btnSecondary} mt-2`}>
                      Send password reset email
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">You signed in with Google. Password is managed by your Google account.</p>
                )}
              </div>

              <div className="pt-2 border-t border-border">
                <button type="button" onClick={closePersonalModal} className={`${btnSecondary} w-full`}>
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </AppPageLayout>
  );
}
