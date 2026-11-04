import { forumRoute } from "@/lib/school-forum/forumRoute";
import { listMyConcerns } from "@/lib/school-forum/forumServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = forumRoute(async ({ db, ctx }) => ({ concerns: await listMyConcerns(db, ctx) }));
