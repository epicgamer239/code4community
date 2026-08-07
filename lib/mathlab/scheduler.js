export const SLOT_TYPES = [
  { id: "tutoring", label: "Tutoring" },
  { id: "remediation", label: "Remediation" },
  { id: "retake", label: "Retake" },
  { id: "office_hours", label: "Office hours" },
];

/** @param {string} type */
export function slotTypeLabel(type) {
  return SLOT_TYPES.find((t) => t.id === type)?.label || type;
}

/** @param {import("firebase/firestore").Timestamp | Date | string | number} value */
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate();
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** @param {import("firebase/firestore").Timestamp | Date | string | number} value */
export function formatSlotWhen(value) {
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** @param {number} booked @param {number} max */
export function spotsLeft(booked, max) {
  return Math.max(0, max - booked);
}

/** @param {{ startAt?: any, signupCloseMinutes?: number }} slot */
export function isPastSignupDeadline(slot) {
  const start = toDate(slot?.startAt);
  if (!start) return false;
  const mins = Number(slot?.signupCloseMinutes);
  if (!Number.isFinite(mins) || mins <= 0) return false;
  const cutoff = start.getTime() - Math.floor(mins) * 60 * 1000;
  return Date.now() >= cutoff;
}

/** @param {{ status?: string, bookedCount?: number, maxCapacity?: number }} slot */
export function isSlotBookable(slot) {
  if (!slot) return false;
  if (slot.status === "closed" || slot.status === "cancelled") return false;
  const max = slot.maxCapacity ?? 0;
  const booked = slot.bookedCount ?? 0;
  if (slot.status === "full" || booked >= max) return false;
  if (isPastSignupDeadline(slot)) return false;
  return true;
}
