"use client";

import { useCallback, useState } from "react";
import { useRunEffect } from "@/hooks/useRunEffect";
import { useAuth } from "@/utils/AuthContext";
import { firestore } from "@/firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { isProtectedAdminEmail } from "@/lib/admin";
import { isWritingCenterAdminUser } from "@/lib/auth/productAdmins";
import {
  pendingWritingCenterTeamDocId,
  WRITING_CENTER_TEAM_PENDING_COLLECTION,
} from "@/lib/writing-center/teamPending";
import { resolveDisplayName } from "@/lib/profile";

async function findUserByEmail(normalized) {
  const snap = await getDocs(collection(firestore, "users"));
  for (const d of snap.docs) {
    const data = d.data();
    if (normalizeEmail(data.email) === normalized) {
      return { id: d.id, ...data };
    }
  }
  return null;
}

export function WritingCenterAdminTeamPanel() {
  const { user: authUser, userData } = useAuth();
  const canManage = Boolean(
    authUser && userData && isWritingCenterAdminUser(userData, authUser.email),
  );
  const [email, setEmail] = useState("");
  const [admins, setAdmins] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!firestore || !canManage) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [usersSnap, pendingSnap] = await Promise.all([
        getDocs(collection(firestore, "users")),
        getDocs(collection(firestore, WRITING_CENTER_TEAM_PENDING_COLLECTION)),
      ]);
      const wcAdmins = [];
      for (const d of usersSnap.docs) {
        const data = d.data();
        if (data.writingCenterAdmin === true) {
          wcAdmins.push({ id: d.id, ...data });
        }
      }
      wcAdmins.sort((a, b) =>
        resolveDisplayName(a).localeCompare(resolveDisplayName(b), undefined, {
          sensitivity: "base",
        }),
      );
      const pendingRows = pendingSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        pending: true,
      }));
      setAdmins(wcAdmins);
      setPending(pendingRows);
    } catch (err) {
      setError(err.message || "Failed to load Writing Center admins.");
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useRunEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    const normalized = normalizeEmail(email);
    if (!isValidEmail(normalized)) {
      setError("Enter a valid email address.");
      return;
    }
    if (isProtectedAdminEmail(normalized)) {
      setError("Built-in site admins already have full access.");
      return;
    }
    setSaving(true);
    try {
      assertClientRateLimit("profileWrite", authUser?.uid);
      const existing = await findUserByEmail(normalized);
      if (existing) {
        if (existing.writingCenterAdmin === true) {
          setMessage("That user is already a Writing Center admin.");
          return;
        }
        await updateDoc(doc(firestore, "users", existing.id), {
          writingCenterAdmin: true,
          updatedAt: serverTimestamp(),
        });
        setMessage(`Added Writing Center admin for ${resolveDisplayName(existing) || normalized}.`);
        await deleteDoc(
          doc(firestore, WRITING_CENTER_TEAM_PENDING_COLLECTION, pendingWritingCenterTeamDocId(normalized)),
        ).catch(() => {});
      } else {
        await setDoc(
          doc(firestore, WRITING_CENTER_TEAM_PENDING_COLLECTION, pendingWritingCenterTeamDocId(normalized)),
          {
            email: normalized,
            grantType: "writingCenterAdmin",
            addedBy: normalizeEmail(authUser?.email) || "",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        );
        setMessage(`Saved Writing Center admin for ${normalized}. It applies when they sign up.`);
      }
      setEmail("");
      await load();
    } catch (err) {
      setError(err.message || "Failed to add Writing Center admin.");
    } finally {
      setSaving(false);
    }
  };

  const removeAdmin = async (row) => {
    if (isProtectedAdminEmail(row.email)) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      assertClientRateLimit("profileWrite", authUser?.uid);
      if (row.pending) {
        await deleteDoc(doc(firestore, WRITING_CENTER_TEAM_PENDING_COLLECTION, row.id));
      } else {
        await updateDoc(doc(firestore, "users", row.id), {
          writingCenterAdmin: false,
          updatedAt: serverTimestamp(),
        });
      }
      setMessage(`Removed Writing Center admin for ${row.email || row.id}.`);
      await load();
    } catch (err) {
      setError(err.message || "Failed to remove admin.");
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) return null;

  return (
    <section className="mb-8 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Writing Center admins</h2>
      <p className="mt-1 text-sm text-gray-600">
        Can use this admin dashboard only (not Math Lab team or site admin).
      </p>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-2 text-sm text-green-700">{message}</p> : null}
      <form onSubmit={handleAdd} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          placeholder="name@lcps.org"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          required
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Add admin"}
        </button>
      </form>
      {loading ? (
        <p className="mt-4 text-sm text-gray-500">Loading…</p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100">
          {[...pending, ...admins].length === 0 ? (
            <li className="py-2 text-sm text-gray-500">No Writing Center admins yet.</li>
          ) : (
            [...pending, ...admins].map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div>
                  <span className="font-medium text-gray-900">
                    {resolveDisplayName(row) || row.email}
                  </span>
                  {row.pending ? (
                    <span className="ml-2 text-xs text-amber-700">Pending signup</span>
                  ) : null}
                  <div className="text-xs text-gray-500">{row.email}</div>
                </div>
                {!isProtectedAdminEmail(row.email) ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => removeAdmin(row)}
                    className="text-red-600 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))
          )}
        </ul>
      )}
    </section>
  );
}
