import { forumRoute } from "@/lib/school-forum/forumRoute";
import { listStaff, setStaffRole } from "@/lib/school-forum/forumServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = forumRoute(async ({ request, db, ctx }) => ({
  staff: await listStaff(db, ctx, { schoolId: new URL(request.url).searchParams.get("schoolId") }),
}));

/** Body: { schoolId?, email, role: "moderator" | "admin" | "none" } */
export const POST = forumRoute(async ({ db, ctx, body }) => setStaffRole(db, ctx, await body()));
