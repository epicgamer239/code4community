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
import { ADMIN_CONFIG, canRemoveTeamPrivileges, isProtectedAdminEmail } from "@/lib/admin";
import { normalizeEmail, isValidEmail } from "@/lib/email";
import {
  partitionTeamUsers,
  findUserByNormalizedEmail,
} from "@/lib/mathlab/team";
import {
  MATHLAB_TEAM_PENDING_COLLECTION,
  mergePendingIntoTeam,
  pendingTeamDocId,
} from "@/lib/mathlab/teamPending";
import {
  TUTOR_SERVICE,
  TUTOR_SERVICE_OPTIONS,
  normalizeTutorServices,
  tutorServicesLabel,
  tutorServiceProfileUpdate,
  hasAnyTutorService,
} from "@/lib/tutorServices";

function ServiceBadges({ services }) {
  const labels = TUTOR_SERVICE_OPTIONS.filter((o) => (services || []).includes(o.id));
  if (labels.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 justify-end">
      {labels.map((o) => (
        <span
          key={o.id}
          className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground"
        >
          {o.label}
        </span>
      ))}
    </div>
  );
}

function UserRow({
  user,
  badge,
  badges,
  onRemove,
  removeLabel,
  removeDisabled,
  removeHint,
  subtitle,
}) {
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
        {badges ? (
          <ServiceBadges services={badges} />
        ) : badge ? (
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground">
            {badge}
          </span>
        ) : null}
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
  const [tutorServices, setTutorServices] = useState([TUTOR_SERVICE.MATH_LAB]);
  const [protectedAdmins, setProtectedAdmins] = useState([]);
  const [appointedAdmins, setAppointedAdmins] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  const toggleTutorService = (serviceId) => {
    setTutorServices((prev) => {
      if (prev.includes(serviceId)) {
        return prev.filter((id) => id !== serviceId);
      }
      return normalizeTutorServices([...prev, serviceId]);
    });
  };

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
        services: d.data().services,
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
      setTeachers(parts.teachers);
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
    if (!isValidEmail(normalized)) {
      setError("Enter a valid email address.");
      return;
    }
    if (isProtectedAdminEmail(normalized)) {
      setError("Built-in admins are already configured.");
      return;
    }
    const services = normalizeTutorServices(tutorServices);
    if (grantRole === "tutor" && services.length === 0) {
      setError("Choose at least one service for this tutor.");
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
        } else if (grantRole === "teacher") {
          if (existing.role === "teacher" || existing.role === "admin") {
            setMessage("That user is already a teacher or admin.");
            return;
          }
          await updateDoc(doc(firestore, "users", existing.id), {
            role: "teacher",
            updatedAt: serverTimestamp(),
          });
          setMessage(`Added teacher access for ${existing.displayName || normalized}.`);
        } else {
          if (existing.role === "admin" || existing.role === "teacher") {
            setMessage("That user is already a teacher or admin.");
            return;
          }
          const profileUpdate = tutorServiceProfileUpdate(services, existing);
          await updateDoc(doc(firestore, "users", existing.id), {
            ...profileUpdate,
            updatedAt: serverTimestamp(),
          });
          const label = tutorServicesLabel(services);
          setMessage(
            hasAnyTutorService(existing)
              ? `Updated tutor services for ${existing.displayName || normalized}: ${label}.`
              : `Added tutor access for ${existing.displayName || normalized}: ${label}.`,
          );
        }
        await deleteDoc(doc(firestore, MATHLAB_TEAM_PENDING_COLLECTION, pendingTeamDocId(normalized))).catch(
          () => {},
        );
        window.dispatchEvent(
          new CustomEvent("userRoleChanged", { detail: { userId: existing.id } }),
        );
      } else {
        /** @type {Record<string, unknown>} */
        const pending = {
          email: normalized,
          grantType: grantRole,
          addedBy: normalizeEmail(authUser?.email) || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (grantRole === "tutor") {
          pending.services = services;
        }
        await setDoc(doc(firestore, MATHLAB_TEAM_PENDING_COLLECTION, pendingTeamDocId(normalized)), pending);
        if (grantRole === "tutor") {
          setMessage(
            `Saved tutor access for ${normalized} (${tutorServicesLabel(services)}). It applies when they sign up.`,
          );
        } else {
          setMessage(
            `Saved ${grantRole} access for ${normalized}. It applies automatically when they sign up.`,
          );
        }
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
          ...tutorServiceProfileUpdate([], user),
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

  const removeTeacher = async (user) => {
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
      setMessage(`Removed teacher access for ${user.displayName || user.email}.`);
      await loadTeam();
    } catch (err) {
      setError(err.message || "Failed to remove teacher.");
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
          Add or remove tutors, teachers, and appointed admins. Built-in admins cannot be changed here.
        </p>
      </div>

      <form onSubmit={handleAdd} className="card-elevated p-6 rounded-xl space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Add team member</h2>
        <p className="text-sm text-muted-foreground">
          Add by email (any domain). If they have not signed up yet, access is saved and applied at first login.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
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
            <option value="teacher">Teacher</option>
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

        {grantRole === "tutor" && (
          <fieldset className="rounded-lg border border-border bg-muted/30 px-4 py-3">
            <legend className="px-1 text-sm font-medium text-foreground">Tutor for</legend>
            <p className="text-xs text-muted-foreground mb-3">
              Choose one or both. Re-adding an existing tutor updates their services.
            </p>
            <div className="flex flex-wrap gap-2">
              {TUTOR_SERVICE_OPTIONS.map((option) => {
                const checked = tutorServices.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={checked}
                    onClick={() => toggleTutorService(option.id)}
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      checked
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}
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
        <h2 className="text-lg font-semibold text-foreground px-6 pt-6 pb-2">Teachers</h2>
        <p className="text-sm text-muted-foreground px-6 pb-4">
          Teachers have tutor privileges and appear with a teacher role in Math Lab.
        </p>
        <ul className="px-6 pb-4">
          {teachers.length === 0 ? (
            <li className="text-sm text-muted-foreground py-2">No teachers yet</li>
          ) : (
            teachers.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                badge={user.pending ? "Pending" : "Teacher"}
                subtitle={user.pending ? "Has not signed up yet" : undefined}
                onRemove={() => removeTeacher(user)}
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
          Tutors only see the services they are assigned to. Badges show Math Lab and/or Writing Center.
        </p>
        <ul className="px-6 pb-6">
          {tutors.length === 0 ? (
            <li className="text-sm text-muted-foreground py-2">No tutors yet</li>
          ) : (
            tutors.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                badges={user.services}
                subtitle={
                  user.pending
                    ? `Has not signed up yet${user.services?.length ? ` · ${tutorServicesLabel(user.services)}` : ""}`
                    : undefined
                }
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
