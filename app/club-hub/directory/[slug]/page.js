import {
  getAllClubSlugs,
  getClubBySlug,
} from "@/lib/club-hub/broadRunClubDirectory";
import { normalizeCustomClub } from "@/lib/club-hub/customClubStore";
import { applyCustomClubsFromAdminDb } from "@/lib/club-hub/customClubsServer";
import { getAdminFirestore } from "@/lib/firebase/admin";
import ClubDetailView from "@/components/club-hub/ClubDetailView";
import CustomClubDetailGate from "@/components/club-hub/CustomClubDetailGate";

export const dynamicParams = true;

/** @param {string} slug */
async function resolveClub(slug) {
  const db = getAdminFirestore();
  if (db) {
    try {
      await applyCustomClubsFromAdminDb(db);
    } catch {
      // CI / local build without credentials — use static directory only.
    }
  }
  const fromDirectory = getClubBySlug(slug);
  if (fromDirectory) return fromDirectory;
  if (!db) return null;
  try {
    const snap = await db.collection("clubHubCustomClubs").doc(slug).get();
    if (!snap.exists) return null;
    return normalizeCustomClub({ ...snap.data(), slug: snap.id }, snap.id);
  } catch {
    return null;
  }
}

export function generateStaticParams() {
  return getAllClubSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const club = await resolveClub(slug);
  if (!club) return { title: "Club | Broad Run Club Hub" };
  return {
    title: `${club.name} | Broad Run Club Hub`,
    description: `Learn more about ${club.name} at Broad Run High School.`,
  };
}

export default async function ClubDetailPage({ params }) {
  const { slug } = await params;
  const club = await resolveClub(slug);
  if (club) return <ClubDetailView club={club} slug={slug} />;
  return <CustomClubDetailGate slug={slug} />;
}
