import { normalizeCustomClub } from "@/lib/club-hub/customClubStore";
import { applyCustomClubsFromAdminDb } from "@/lib/club-hub/customClubsServer";
import { getAdminFirestore } from "@/lib/firebase/admin";
import ClubDetailView from "@/components/club-hub/ClubDetailView";
import CustomClubDetailGate from "@/components/club-hub/CustomClubDetailGate";
import { runWithClubHubSchool } from "@/lib/club-hub/activeSchool";
import { ACL_CLUB_HUB_CONFIG } from "@/lib/club-hub/schoolConfig";
import {
  getAclClubBySlug,
  getAllAclClubSlugs,
} from "@/lib/acl/aclClubDirectory";

export const dynamicParams = true;

/** @param {string} slug */
async function resolveClub(slug) {
  return runWithClubHubSchool(ACL_CLUB_HUB_CONFIG, async () => {
    const db = getAdminFirestore();
    if (db) {
      try {
        await applyCustomClubsFromAdminDb(db);
      } catch {
        // Build/CI without credentials
      }
    }
    const fromDirectory = getAclClubBySlug(slug);
    if (fromDirectory) return fromDirectory;
    if (!db) return null;
    try {
      const snap = await db.collection(ACL_CLUB_HUB_CONFIG.collections.customClubs).doc(slug).get();
      if (!snap.exists) return null;
      return normalizeCustomClub({ ...snap.data(), slug: snap.id }, snap.id);
    } catch {
      return null;
    }
  });
}

export function generateStaticParams() {
  return getAllAclClubSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const club = await resolveClub(slug);
  if (!club) return { title: "Club | Academies Club Hub" };
  return {
    title: `${club.name} | Academies Club Hub`,
    description: `Learn more about ${club.name} at Academies of Loudoun.`,
  };
}

export default async function AclClubDetailPage({ params }) {
  const { slug } = await params;
  const club = await resolveClub(slug);
  return club ? <ClubDetailView club={club} slug={slug} /> : <CustomClubDetailGate slug={slug} />;
}
