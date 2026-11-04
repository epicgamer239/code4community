import { forumRoute } from "@/lib/school-forum/forumRoute";
import { getMetrics } from "@/lib/school-forum/forumServer";
import { metricsToCsv } from "@/lib/school-forum/metrics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** ?format=csv downloads the same rows as a spreadsheet. */
export const GET = forumRoute(async ({ request, db, ctx }) => {
  const rows = await getMetrics(db, ctx);
  const format = new URL(request.url).searchParams.get("format");
  if (format === "csv") {
    return new Response(metricsToCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="school-forum-metrics-${ctx.schoolId}.csv"`,
      },
    });
  }
  return { cycles: rows };
});
