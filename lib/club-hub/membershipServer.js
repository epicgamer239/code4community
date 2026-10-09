import { FieldValue } from "firebase-admin/firestore";
import {
  CLUB_HUB_MEMBERSHIPS,
  clubMembershipDocId,
} from "@/lib/club-hub/clubMemberships";
import { CLUB_HUB_MEMBERSHIP_COUNTS } from "@/lib/club-hub/clubMembershipCounts";
import { syncStudentMeetingRowAfterClubLeave } from "@/lib/club-hub/meetingChoicesSheetSync";
import { syncClubRosterMemberLeave } from "@/lib/club-hub/rosterSheetSync";

/**
 * Remove a student from a club (sponsor / admin). Mirrors self-service leave + sheet sync.
 *
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {{ clubSlug: string, userId: string }} args
 */
export async function removeClubMemberFromClub(db, { clubSlug, userId }) {
  const slug = clubSlug?.trim();
  const uid = userId?.trim();
  if (!slug || !uid) {
    return { ok: false, error: "Missing club or user." };
  }

  const membershipRef = db.collection(CLUB_HUB_MEMBERSHIPS).doc(clubMembershipDocId(slug, uid));
  const existing = await membershipRef.get();
  if (!existing.exists) {
    await syncStudentMeetingRowAfterClubLeave({ userId: uid, clubSlug: slug });
    return { ok: true, removed: false, reason: "not_member" };
  }

  const clubName =
    typeof existing.data()?.clubName === "string" ? existing.data().clubName.trim() : slug;

  await membershipRef.delete();
  await db
    .collection(CLUB_HUB_MEMBERSHIP_COUNTS)
    .doc(slug)
    .set(
      {
        clubSlug: slug,
        clubName: clubName.slice(0, 120) || slug,
        memberCount: FieldValue.increment(-1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  await syncClubRosterMemberLeave({ clubSlug: slug, userId: uid });
  const meeting = await syncStudentMeetingRowAfterClubLeave({ userId: uid, clubSlug: slug });

  return { ok: true, removed: true, meeting };
}
