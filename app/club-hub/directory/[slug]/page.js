import { notFound } from "next/navigation";
import {
  getAllClubSlugs,
  getClubBySlug,
} from "@/lib/club-hub/broadRunClubDirectory";
import ClubDetailView from "@/components/club-hub/ClubDetailView";

export function generateStaticParams() {
  return getAllClubSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const club = getClubBySlug(slug);
  if (!club) return { title: "Club | Broad Run Club Hub" };
  return {
    title: `${club.name} | Broad Run Club Hub`,
    description: `Learn more about ${club.name} at Broad Run High School.`,
  };
}

export default async function ClubDetailPage({ params }) {
  const { slug } = await params;
  const club = getClubBySlug(slug);
  if (!club) notFound();

  return <ClubDetailView club={club} slug={slug} />;
}
