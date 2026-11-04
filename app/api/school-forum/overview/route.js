import { forumRoute } from "@/lib/school-forum/forumRoute";
import { getForumOverview } from "@/lib/school-forum/forumServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = forumRoute(({ db, ctx }) => getForumOverview(db, ctx));
