import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Railway's healthcheck target. Reports unhealthy when the database is
 * unreachable, so a deploy that cannot serve orders never replaces a good one.
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", database: "up" });
  } catch {
    return Response.json({ status: "degraded", database: "down" }, { status: 503 });
  }
}
