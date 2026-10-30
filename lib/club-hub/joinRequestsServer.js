import { FieldValue } from "firebase-admin/firestore";
import {
  CLUB_HUB_MEMBERSHIPS,
  clubMembershipDocId,
  normalizeClubMembership,
} from "@/lib/club-hub/clubMemberships";
import { CLUB_HUB_MEMBERSHIP_COUNTS } from "@/lib/club-hub/clubMembershipCounts";
import { CLUB_HUB_PAGES } from "@/lib/club-hub/clubPages";
import {
  CLUB_HUB_JOIN_REQUESTS,
  joinRequestDocId,
  normalizeJoinRequest,
} from "@/lib/club-hub/joinRequests";
import { clubRequiresJoinApproval } from "@/lib/club-hub/joinPolicy";
import { isClubMembershipFull } from "@/lib/club-hub/memberSignupLimit";
import { applyMeetingDayOverridesFromAdminDb } from "@/lib/club-hub/clubMeetingDaysServer";
import { deriveMeetingChoicesForUserAdmin } from "@/lib/club-hub/meetingChoicesFromMembershipsAdmin";
import {
  defaultSeminarDaysForClub,
  getSeminarMembershipJoinError,
  normalizeSeminarDays,
} from "@/lib/club-hub/seminarMembershipLimit";
import { syncClubRosterMemberJoin } from "@/lib/club-hub/rosterSheetSync";
import { syncStudentMeetingRowToSheet } from "@/lib/club-hub/meetingChoicesSheetSync";

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {string} clubSlug
 */
export async function listPendingJoinRequests(db, clubSlug) {
  const slug = clubSlug?.trim();
  if (!slug) return [];
  const snap = await db.collection(CLUB_HUB_JOIN_REQUESTS).where("clubSlug", "==", slug).get();
  return snap.docs
    .map((d) => normalizeJoinRequest({ ...d.data(), id: d.id }))
    .filter(Boolean);
}

/**
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {{ clubSlug: string, userId: string, action: "approve" | "deny" }} args
 */
export async function reviewClubJoinRequest(db, { clubSlug, userId, action }) {
  const slug = clubSlug?.trim();
  const uid = userId?.trim();
  if (!slug || !uid) return { ok: false, error: "Missing club or user." };
  if (action !== "approve" && action !== "deny") {
    return { ok: false, error: "Choose approve or deny." };
  }

  const requestRef = db.collection(CLUB_HUB_JOIN_REQUESTS).doc(joinRequestDocId(slug, uid));
  const requestSnap = await requestRef.get();
  if (!requestSnap.exists) return { ok: false, error: "That join request is no longer pending." };
  const request = requestSnap.data() || {};
  if (request.status !== "pending" || request.clubSlug !== slug || request.userId !== uid) {
    return { ok: false, error: "That join request is no longer pending." };
  }

  if (action === "deny") {
    await requestRef.delete();
    return { ok: true, action: "deny" };
  }

  const pageSnap = await db.collection(CLUB_HUB_PAGES).doc(slug).get();
  const page = pageSnap.exists ? pageSnap.data() : null;
  if (!clubRequiresJoinApproval(page?.joinPolicy)) {
    await requestRef.delete();
    return { ok: false, error: "This club is open join, so approval is not required." };
  }

  const countSnap = await db.collection(CLUB_HUB_MEMBERSHIP_COUNTS).doc(slug).get();
  const memberCount = countSnap.exists ? Number(countSnap.data()?.memberCount) || 0 : 0;
  if (isClubMembershipFull(memberCount, page?.memberSignupLimit)) {
    return { ok: false, error: "This club is at its member signup limit." };
  }

  const membershipRef = db.collection(CLUB_HUB_MEMBERSHIPS).doc(clubMembershipDocId(slug, uid));
  const existingMember = await membershipRef.get();
  const clubName =
    (typeof request.clubName === "string" && request.clubName.trim()) || slug;
  const displayName =
    (typeof request.displayName === "string" && request.displayName.trim()) || "Member";
  const userEmail = typeof request.userEmail === "string" ? request.userEmail : "";

  if (!existingMember.exists) {
    await applyMeetingDayOverridesFromAdminDb(db);
    const memSnap = await db.collection(CLUB_HUB_MEMBERSHIPS).where("userId", "==", uid).get();
    const existingMemberships = memSnap.docs
      .map((d) => normalizeClubMembership({ ...d.data(), id: d.id }))
      .filter(Boolean);
    const seminarDays =
      normalizeSeminarDays(request.seminarDays) ?? defaultSeminarDaysForClub(slug);
    const seminarError = getSeminarMembershipJoinError(existingMemberships, slug, {
      seminarDays,
    });
    if (seminarError) return { ok: false, error: seminarError };

    const batch = db.batch();
    batch.set(membershipRef, {
      clubSlug: slug,
      clubName: clubName.slice(0, 120),
      userId: uid,
      userEmail,
      displayName: displayName.slice(0, 100),
      seminarDays,
      joinedAt: FieldValue.serverTimestamp(),
    });
    batch.set(
      db.collection(CLUB_HUB_MEMBERSHIP_COUNTS).doc(slug),
      {
        clubSlug: slug,
        clubName: clubName.slice(0, 120),
        memberCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    batch.delete(requestRef);
    await batch.commit();
  } else {
    await requestRef.delete();
  }

  try {
    await syncClubRosterMemberJoin({
      clubSlug: slug,
      userId: uid,
      displayName,
      userEmail,
    });
  } catch {
    // Membership is saved; the roster sheet is best-effort.
  }

  try {
    const choices = await deriveMeetingChoicesForUserAdmin(db, uid);
    await syncStudentMeetingRowToSheet({
      userId: uid,
      displayName,
      goldClubSlug: choices.goldClubSlug,
      maroonClubSlug: choices.maroonClubSlug,
    });
  } catch {
    // Meeting sheet is best-effort.
  }

  return { ok: true, action: "approve" };
}
