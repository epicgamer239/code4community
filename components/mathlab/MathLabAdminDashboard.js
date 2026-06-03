"use client";

import { useCallback, useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  updateDoc,
  setDoc,
  deleteDoc,
  doc,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { firestore } from "@/firebase";
import { useAuth } from "@/utils/AuthContext";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import { ADMIN_CONFIG, canRemoveTeamPrivileges, isProtectedAdminEmail } from "@/config/admin";
import { normalizeEmail } from "@/lib/email";
import {
  partitionTeamUsers,
  isValidLcpsEmail,
  findUserByNormalizedEmail,
} from "@/lib/mathlabTeam";
import {
  MATHLAB_TEAM_PENDING_COLLECTION,
  mergePendingIntoTeam,
  pendingTeamDocId,
} from "@/lib/mathlabTeamPending";

function UserRow({ user, badge, onRemove, removeLabel, removeDisabled, removeHint, subtitle }) {
  return (
    <li className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
      <div className="min-w-0">
        <p className="font-medium text-foreground truncate">
          {user.displayName || user.email || "Unknown user"}
        </p>
        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {badge && (
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground">
            {badge}
          </span>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            disabled={removeDisabled}
            title={removeHint}
            className="text-sm font-medium text-destructive hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
          >
            {removeLabel}
          </button>
        )}
      </div>
    </li>
  );
}

export default function MathLabAdminDashboard() {
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [grantRole, setGrantRole] = useState("tutor");
  const [protectedAdmins, setProtectedAdmins] = useState([]);
  const [appointedAdmins, setAppointedAdmins] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  const loadTeam = useCallback(async () => {
    if (!firestore) {
      setError("Firestore is not available.");
      setLoading(false);
      return;
    }
    setError("");
    try {
      const [usersSnap, pendingSnap] = await Promise.all([
        getDocs(collection(firestore, "users")),
        getDocs(collection(firestore, MATHLAB_TEAM_PENDING_COLLECTION)),
      ]);
      const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllUsers(users);
      const pendingRows = pendingSnap.docs.map((d) => ({
        id: d.id,
        email: d.data().email || d.id,
        grantType: d.data().grantType,
      }));
      const parts = mergePendingIntoTeam(partitionTeamUsers(users), pendingRows);
      const protectedList = [...parts.protectedAdmins];
      const seenProtected = new Set(
        protectedList.map((u) => normalizeEmail(u.email)).filter(Boolean),
      );
      for (const email of ADMIN_CONFIG.ADMIN_EMAILS) {
        const normalized = normalizeEmail(email);
        if (!seenProtected.has(normalized)) {
          protectedList.push({
            id: `builtin-${normalized}`,
            email: normalized,
            displayName: normalized,
          });
          seenProtected.add(normalized);
        }
      }
      protectedList.sort((a, b) =>
        (a.displayName || a.email || "").localeCompare(b.displayName || b.email || "", undefined, {
          sensitivity: "base",
        }),
      );
      setProtectedAdmins(protectedList);
      setAppointedAdmins(parts.appointedAdmins);
      setTutors(parts.tutors);
    } catch (err) {
      setError(err.message || "Failed to load team list.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const findUserByEmail = async (normalizedEmail) => {
    const fromCache = findUserByNormalizedEmail(allUsers, normalizedEmail);
    if (fromCache) return fromCache;
    const q = query(collection(firestore, "users"), where("email", "==", normalizedEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return { id: d.id, ...d.data() };
    }
    return findUserByNormalizedEmail(
      (await getDocs(collection(firestore, "users"))).docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })),
      normalizedEmail,
    );
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    const normalized = normalizeEmail(email);
    if (!isValidLcpsEmail(normalized)) {
      setError("Enter a valid @lcps.org school email.");
      return;
    }
    if (isProtectedAdminEmail(normalized)) {
      setError("Built-in admins are already configured.");
      return;
    }
    setSaving(true);
    try {
      assertClientRateLimit("profileWrite", authUser?.uid);
      const existing = await findUserByEmail(normalized);
      if (existing) {
        if (grantRole === "admin") {
          if (existing.role === "admin") {
            setMessage("That user is already an admin.");
            return;
          }
          await updateDoc(doc(firestore, "users", existing.id), {
            role: "admin",
            updatedAt: serverTimestamp(),
          });
          setMessage(`Added admin access for ${existing.displayName || normalized}.`);
        } else {
          if (existing.mathLabRole === "tutor" || existing.role === "admin") {
            setMessage("That user is already a tutor or admin.");
            return;
          }
          await updateDoc(doc(firestore, "users", existing.id), {
            mathLabRole: "tutor",
            updatedAt: serverTimestamp(),
          });
          setMessage(`Added tutor access for ${existing.displayName || normalized}.`);
        }
        await deleteDoc(doc(firestore, MATHLAB_TEAM_PENDING_COLLECTION, pendingTeamDocId(normalized))).catch(
          () => {},
        );
        window.dispatchEvent(
          new CustomEvent("userRoleChanged", { detail: { userId: existing.id } }),
        );
      } else {
        await setDoc(doc(firestore, MATHLAB_TEAM_PENDING_COLLECTION, pendingTeamDocId(normalized)), {
          email: normalized,
          grantType: grantRole,
          addedBy: normalizeEmail(authUser?.email) || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setMessage(
          `Saved ${grantRole} access for ${normalized}. It applies automatically when they sign up.`,
        );
      }
      setEmail("");
      await loadTeam();
    } catch (err) {
      setError(err.message || "Failed to add user.");
    } finally {
      setSaving(false);
    }
  };

  const removeTutor = async (user) => {
    if (!canRemoveTeamPrivileges(user.email)) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      assertClientRateLimit("profileWrite", authUser?.uid);
      if (user.pending) {
        await deleteDoc(doc(firestore, MATHLAB_TEAM_PENDING_COLLECTION, user.id));
      } else {
        await updateDoc(doc(firestore, "users", user.id), {
          mathLabRole: "",
          updatedAt: serverTimestamp(),
        });
        window.dispatchEvent(new CustomEvent("userRoleChanged", { detail: { userId: user.id } }));
      }
      setMessage(`Removed tutor access for ${user.displayName || user.email}.`);
      await loadTeam();
    } catch (err) {
      setError(err.message || "Failed to remove tutor.");
    } finally {
      setSaving(false);
    }
  };

  const removeAppointedAdmin = async (user) => {
    if (!canRemoveTeamPrivileges(user.email)) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      assertClientRateLimit("profileWrite", authUser?.uid);
      if (user.pending) {
        await deleteDoc(doc(firestore, MATHLAB_TEAM_PENDING_COLLECTION, user.id));
      } else {
        await updateDoc(doc(firestore, "users", user.id), {
          role: "student",
          updatedAt: serverTimestamp(),
        });
        window.dispatchEvent(new CustomEvent("userRoleChanged", { detail: { userId: user.id } }));
      }
      setMessage(`Removed admin access for ${user.displayName || user.email}.`);
      await loadTeam();
    } catch (err) {
      setError(err.message || "Failed to remove admin.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Add or remove tutors and appointed admins. Built-in admins cannot be changed here.
        </p>
      </div>

      <form onSubmit={handleAdd} className="card-elevated p-6 rounded-xl space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Add team member</h2>
        <p className="text-sm text-muted-foreground">
          Add by school email. If they have not signed up yet, access is saved and applied at first login.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@lcps.org"
            className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background"
            required
          />
          <select
            value={grantRole}
            onChange={(e) => setGrantRole(e.target.value)}
            className="select sm:w-40"
            aria-label="Role to grant"
          >
            <option value="tutor">Tutor</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-foreground text-background font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Add"}
          </button>
        </div>
      </form>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm text-green-700 dark:text-green-400" role="status">
          {message}
        </p>
      )}

      <section className="card-elevated rounded-xl overflow-hidden">
        <h2 className="text-lg font-semibold text-foreground px-6 pt-6 pb-2">Built-in admins</h2>
        <p className="text-sm text-muted-foreground px-6 pb-4">
          Permanent admins (cannot be removed in this dashboard).
        </p>
        <ul className="px-6 pb-4">
          {protectedAdmins.length === 0 ? (
            <li className="text-sm text-muted-foreground py-2">None listed</li>
          ) : (
            protectedAdmins.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                badge="Built-in"
                removeDisabled
                removeHint="Built-in admins cannot be removed"
              />
            ))
          )}
        </ul>
      </section>

      <section className="card-elevated rounded-xl overflow-hidden">
        <h2 className="text-lg font-semibold text-foreground px-6 pt-6 pb-2">Appointed admins</h2>
        <p className="text-sm text-muted-foreground px-6 pb-4">
          Admins added through this dashboard.
        </p>
        <ul className="px-6 pb-4">
          {appointedAdmins.length === 0 ? (
            <li className="text-sm text-muted-foreground py-2">No appointed admins yet</li>
          ) : (
            appointedAdmins.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                badge={user.pending ? "Pending" : "Admin"}
                subtitle={user.pending ? "Has not signed up yet" : undefined}
                onRemove={() => removeAppointedAdmin(user)}
                removeLabel="Remove"
                removeDisabled={saving}
              />
            ))
          )}
        </ul>
      </section>

      <section className="card-elevated rounded-xl overflow-hidden">
        <h2 className="text-lg font-semibold text-foreground px-6 pt-6 pb-2">Tutors</h2>
        <p className="text-sm text-muted-foreground px-6 pb-4">
          Users who can accept tutoring requests on the tutor dashboard.
        </p>
        <ul className="px-6 pb-6">
          {tutors.length === 0 ? (
            <li className="text-sm text-muted-foreground py-2">No tutors yet</li>
          ) : (
            tutors.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                badge={user.pending ? "Pending" : "Tutor"}
                subtitle={user.pending ? "Has not signed up yet" : undefined}
                onRemove={() => removeTutor(user)}
                removeLabel="Remove"
                removeDisabled={saving}
              />
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
