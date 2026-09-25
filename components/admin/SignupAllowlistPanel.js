"use client";

import { useCallback, useState } from "react";
import { useRunEffect } from "@/hooks/useRunEffect";
import { useAuth } from "@/utils/AuthContext";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import {
  addEmailToSignupAllowlist,
  fetchSignupEmailAllowlist,
  removeEmailFromSignupAllowlist,
} from "@/lib/auth/signupAllowlist";
import { isLcpsOrgEmail } from "@/lib/auth/signupEmailPolicy";

export default function SignupAllowlistPanel() {
  const { user } = useAuth();
  const [emails, setEmails] = useState([]);
  const [allowlistMap, setAllowlistMap] = useState({});
  const [draftEmail, setDraftEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const map = await fetchSignupEmailAllowlist();
      setAllowlistMap(map);
      setEmails(Object.keys(map).sort((a, b) => a.localeCompare(b)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load allowlist.");
    } finally {
      setLoading(false);
    }
  }, []);

  useRunEffect(() => {
    void load();
  }, [load]);

  const run = async (fn) => {
    if (!user?.uid || busy) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = (e) => {
    e.preventDefault();
    const normalized = normalizeEmail(draftEmail);
    if (!isValidEmail(normalized)) {
      setError("Enter a valid email.");
      return;
    }
    if (isLcpsOrgEmail(normalized)) {
      setError("@lcps.org addresses can already sign up — no allowlist entry needed.");
      return;
    }
    void run(async () => {
      await addEmailToSignupAllowlist({
        email: normalized,
        adminUid: user.uid,
        existing: allowlistMap,
      });
      setDraftEmail("");
      setMessage(`Added ${normalized} to the signup allowlist.`);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-neutral-900">Signup email allowlist</h2>
        <p className="mt-1 text-sm text-neutral-600">
          New accounts must use an <strong>@lcps.org</strong> email unless you add an exception
          here (partners, alumni testers, etc.).
        </p>
      </div>

      {message ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
        <input
          type="email"
          value={draftEmail}
          onChange={(e) => setDraftEmail(e.target.value)}
          placeholder="partner@gmail.com"
          className="min-w-[16rem] flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Add email
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : emails.length === 0 ? (
        <p className="text-sm text-neutral-500">No external emails allowlisted yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 bg-white">
          {emails.map((email) => (
            <li key={email} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <span className="text-sm font-medium text-neutral-900">{email}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await removeEmailFromSignupAllowlist({
                      email,
                      adminUid: user.uid,
                      existing: allowlistMap,
                    });
                    setMessage(`Removed ${email} from the allowlist.`);
                  })
                }
                className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
