import { FieldValue } from "firebase-admin/firestore";
import { clubHubCol } from "@/lib/club-hub/activeSchool";
import {
  CLUB_HUB_OPPORTUNITY_EVENTS,
  normalizeOpportunityDescription,
  normalizeOpportunityEventDate,
  normalizeOpportunitySignUpUrl,
  normalizeOpportunityTitle,
} from "@/lib/club-hub/clubHubOpportunityEvents";

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {{ publishedOnly?: boolean }} [opts]
 */
export async function listClubHubOpportunityEvents(db, opts = {}) {
  const snap = await db.collection(clubHubCol("opportunityEvents")).orderBy("createdAt", "desc").get();
  let rows = snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
  if (opts.publishedOnly) {
    rows = rows.filter((row) => row.published !== false);
  }
  rows.sort((a, b) => {
    const da = typeof a.eventDate === "string" ? a.eventDate : "";
    const db_ = typeof b.eventDate === "string" ? b.eventDate : "";
    if (da && db_) return da.localeCompare(db_);
    if (da) return -1;
    if (db_) return 1;
    return 0;
  });
  return rows;
}

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {{
 *   title: string,
 *   description?: string,
 *   eventDate?: string,
 *   signUpUrl: string,
 *   published?: boolean,
 *   createdByEmail: string,
 *   createdByUid: string,
 * }} input
 */
export async function createClubHubOpportunityEvent(db, input) {
  const title = normalizeOpportunityTitle(input.title);
  if (!title) throw new Error("Enter an event title.");
  const description = normalizeOpportunityDescription(input.description);
  if (!description) throw new Error("Enter a short description (include a sign-up link if needed).");
  const signUpUrl = normalizeOpportunitySignUpUrl(input.signUpUrl);

  const id = `opp-${Date.now()}`;
  const doc = {
    title,
    description,
    eventDate: normalizeOpportunityEventDate(input.eventDate),
    signUpUrl,
    published: input.published !== false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdByEmail: input.createdByEmail || "",
    createdByUid: input.createdByUid || "",
  };

  await db.collection(clubHubCol("opportunityEvents")).doc(id).set(doc);
  return { id, ...doc };
}

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {string} eventId
 */
export async function deleteClubHubOpportunityEvent(db, eventId) {
  const id = eventId?.trim();
  if (!id) throw new Error("Missing event.");
  const ref = db.collection(clubHubCol("opportunityEvents")).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Event not found.");
  await ref.delete();
  return { ok: true, id };
}
