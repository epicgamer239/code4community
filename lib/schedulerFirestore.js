import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { firestore } from "@/firebase";
import { assertClientRateLimit } from "@/utils/clientRateLimit";
import { SchedulerCache } from "@/utils/cache";

function requireDb() {
  if (!firestore) throw new Error("Firestore is not available.");
  return firestore;
}

export function mapSlotDocs(snap) {
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function mapBookingDocs(snap) {
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * @param {{ slotsCollection: string, bookingsCollection: string }} collections
 */
export function createSchedulerFirestore({ slotsCollection, bookingsCollection }) {
  function subscribeOpenSlots(onData) {
    const db = requireDb();
    const now = Timestamp.now();
    const q = query(
      collection(db, slotsCollection),
      where("startAt", ">=", now),
      orderBy("startAt", "asc")
    );
    return onSnapshot(
      q,
      (snap) => {
        const slots = mapSlotDocs(snap).filter(
          (s) => s.status === "open" || s.status === "full"
        );
        SchedulerCache.setOpenSlots(slotsCollection, slots);
        onData(slots);
      },
      (err) => {
        onData([]);
      }
    );
  }

  function subscribeHostSlots(hostId, onData) {
    const db = requireDb();
    const q = query(
      collection(db, slotsCollection),
      where("hostId", "==", hostId),
      orderBy("startAt", "desc")
    );
    return onSnapshot(q, (snap) => onData(mapSlotDocs(snap)), (err) => {
      onData([]);
    });
  }

  function subscribeStudentBookings(studentId, onData) {
    const db = requireDb();
    const q = query(
      collection(db, bookingsCollection),
      where("studentId", "==", studentId),
      where("status", "==", "confirmed"),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(
      q,
      (snap) => {
        const bookings = mapBookingDocs(snap);
        SchedulerCache.setStudentBookings(
          bookingsCollection,
          studentId,
          bookings
        );
        onData(bookings);
      },
      (err) => {
        onData([]);
      }
    );
  }

  async function fetchBookingsForSlot(slotId) {
    const db = requireDb();
    const q = query(
      collection(db, bookingsCollection),
      where("slotId", "==", slotId),
      where("status", "==", "confirmed")
    );
    const snap = await getDocs(q);
    return mapBookingDocs(snap);
  }

  async function createSlot(params) {
    const db = requireDb();
    const ref = doc(collection(db, slotsCollection));
    const maxCapacity = Math.max(1, Math.min(50, Number(params.maxCapacity) || 1));
    const signupCloseMinutes = Math.max(
      0,
      Math.min(7 * 24 * 60, Number(params.signupCloseMinutes) || 0)
    );
    await setDoc(ref, {
      hostId: params.hostId,
      hostName: params.hostName || "Teacher",
      slotType: params.slotType || "office_hours",
      course: params.course || "",
      startAt: Timestamp.fromDate(params.startAt),
      endAt: Timestamp.fromDate(params.endAt),
      maxCapacity,
      bookedCount: 0,
      status: "open",
      location: params.location || "",
      notes: params.notes || "",
      signupCloseMinutes,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  async function closeSlot(slotId) {
    const db = requireDb();
    await updateDoc(doc(db, slotsCollection, slotId), {
      status: "closed",
      updatedAt: serverTimestamp(),
    });
  }

  async function deleteSlot(slotId) {
    const db = requireDb();
    const bookings = await fetchBookingsForSlot(slotId);
    if (bookings.length > 0) {
      throw new Error("Cannot delete a slot that has bookings. Close it instead.");
    }
    await deleteDoc(doc(db, slotsCollection, slotId));
  }

  async function bookSlot(params) {
    const db = requireDb();
    const { slotId, studentId, studentName, studentEmail, note } = params;
    assertClientRateLimit("schedulerBook", studentId);
    const bookingId = `${slotId}_${studentId}`;
    const slotRef = doc(db, slotsCollection, slotId);
    const bookingRef = doc(db, bookingsCollection, bookingId);

    await runTransaction(db, async (tx) => {
      const slotSnap = await tx.get(slotRef);
      if (!slotSnap.exists()) throw new Error("This slot no longer exists.");
      const slot = slotSnap.data();
      if (slot.status === "closed" || slot.status === "cancelled") {
        throw new Error("This slot is closed.");
      }
      if (slot.startAt?.toDate) {
        const start = slot.startAt.toDate();
        const mins = Number(slot.signupCloseMinutes);
        if (Number.isFinite(mins) && mins > 0) {
          const cutoff = start.getTime() - Math.floor(mins) * 60 * 1000;
          if (Date.now() >= cutoff) {
            throw new Error("Sign-ups are closed for this time.");
          }
        }
      }
      const max = slot.maxCapacity ?? 1;
      const booked = slot.bookedCount ?? 0;
      if (booked >= max || slot.status === "full") {
        throw new Error("This slot is full.");
      }

      const existing = await tx.get(bookingRef);
      if (existing.exists() && existing.data()?.status === "confirmed") {
        throw new Error("You already booked this slot.");
      }

      const newCount = booked + 1;
      tx.set(bookingRef, {
        slotId,
        studentId,
        studentName: studentName || "Student",
        studentEmail: studentEmail || "",
        slotType: slot.slotType,
        course: slot.course || "",
        hostId: slot.hostId,
        hostName: slot.hostName || "",
        startAt: slot.startAt,
        endAt: slot.endAt,
        note: note || "",
        status: "confirmed",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      tx.update(slotRef, {
        bookedCount: newCount,
        status: newCount >= max ? "full" : "open",
        updatedAt: serverTimestamp(),
      });
    });
  }

  async function cancelBooking(slotId, studentId) {
    const db = requireDb();
    const bookingId = `${slotId}_${studentId}`;
    const slotRef = doc(db, slotsCollection, slotId);
    const bookingRef = doc(db, bookingsCollection, bookingId);

    await runTransaction(db, async (tx) => {
      const bookingSnap = await tx.get(bookingRef);
      if (!bookingSnap.exists() || bookingSnap.data()?.status !== "confirmed") {
        throw new Error("Booking not found.");
      }
      const slotSnap = await tx.get(slotRef);
      if (!slotSnap.exists()) {
        tx.update(bookingRef, { status: "cancelled", updatedAt: serverTimestamp() });
        return;
      }
      const slot = slotSnap.data();
      const booked = Math.max(0, (slot.bookedCount ?? 1) - 1);
      const max = slot.maxCapacity ?? 1;
      tx.update(bookingRef, { status: "cancelled", updatedAt: serverTimestamp() });
      tx.update(slotRef, {
        bookedCount: booked,
        status: booked >= max ? "full" : "open",
        updatedAt: serverTimestamp(),
      });
    });
  }

  return {
    slotsCollection,
    bookingsCollection,
    subscribeOpenSlots,
    subscribeHostSlots,
    subscribeStudentBookings,
    fetchBookingsForSlot,
    createSlot,
    closeSlot,
    deleteSlot,
    bookSlot,
    cancelBooking,
  };
}

export const officeHoursScheduler = createSchedulerFirestore({
  slotsCollection: "officeHourSlots",
  bookingsCollection: "officeHourBookings",
});
