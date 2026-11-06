import { redirect } from "next/navigation";

/** Opportunities & Resources is BRHS-only; ACL has no resources surface. */
export default function AclClubHubResourcesPage() {
  redirect("/acl/club-hub");
}
