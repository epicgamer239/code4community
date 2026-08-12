"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/utils/AuthContext";
import { firestore } from "@/firebase";
import {
  fetchWritingCenterTeachers,
  shareSessionReceiptWithTeacher,
} from "@/lib/writing-center/receiptShares";
import { resolveDisplayName } from "@/lib/profile";
import { getSessionReportUrl } from "@/lib/writing-center/sessionReport";

/**
 * Button + modal for a student to send a completed session PDF to a teacher.
 */
export function SendReceiptToTeacherButton({
  session,
  alreadySentTeacherIds = [],
  onSent,
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [teacherId, setTeacherId] = useState("");
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const reportUrl = getSessionReportUrl(session);
  const sentSet = useMemo(
    () => new Set(alreadySentTeacherIds),
    [alreadySentTeacherIds],
  );

  useEffect(() => {
    if (!open || !firestore) return;
    let cancelled = false;
    (async () => {
      setLoadingTeachers(true);
      setError("");
      try {
        const list = await fetchWritingCenterTeachers(firestore);
        if (!cancelled) {
          setTeachers(list);
          if (list.length === 1) setTeacherId(list[0].id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load teachers.");
        }
      } finally {
        if (!cancelled) setLoadingTeachers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!reportUrl || session.status !== "COMPLETED") return null;

  const close = () => {
    setOpen(false);
    setError("");
    setMessage("");
    setTeacherId("");
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!user || saving) return;
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) {
      setError("Select a teacher.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await shareSessionReceiptWithTeacher({
        session,
        teacher,
        sharedBy: user,
      });
      setMessage(`Sent to ${resolveDisplayName(teacher)}.`);
      onSent?.(teacher);
      setTimeout(close, 900);
    } catch (err) {
      setError(err.message || "Failed to send receipt.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-indigo-600 hover:text-indigo-900 whitespace-nowrap"
      >
        Send to teacher
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <form onSubmit={handleSend} className="space-y-4 p-5 sm:p-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Send receipt to a teacher
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Your teacher will see this Writing Center session and can open the
                  PDF receipt.
                </p>
              </div>

              {loadingTeachers ? (
                <p className="text-sm text-gray-500">Loading teachers…</p>
              ) : teachers.length === 0 ? (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  No teachers are set up yet. Ask an admin to add someone with the
                  teacher role.
                </p>
              ) : (
                <div>
                  <label
                    htmlFor="receipt-teacher"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Teacher
                  </label>
                  <select
                    id="receipt-teacher"
                    required
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="">Select a teacher</option>
                    {teachers.map((t) => {
                      const sent = sentSet.has(t.id);
                      return (
                        <option key={t.id} value={t.id}>
                          {resolveDisplayName(t)}
                          {sent ? " — already sent" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {error && (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              {message && (
                <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  {message}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || loadingTeachers || teachers.length === 0}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Sending…" : "Send receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
