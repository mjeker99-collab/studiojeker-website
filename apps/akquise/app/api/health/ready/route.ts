import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await db.$queryRaw`SELECT "revision" FROM "ProjectDraft" LIMIT 0`;
    await db.$queryRaw`SELECT "mode" FROM "Delivery" LIMIT 0`;
    await db.$queryRaw`SELECT "version", "workspace" FROM "MarketingContent" LIMIT 0`;
    await db.$queryRaw`SELECT "planningRevision" FROM "Draft" LIMIT 0`;
    await db.$queryRaw`SELECT "status" FROM "StudioJob" LIMIT 0`;
    await db.$queryRaw`SELECT "revision" FROM "LibraryItem" LIMIT 0`;
    await db.$queryRaw`SELECT "brandRevision" FROM "StudioOrganization" LIMIT 0`;
    await db.$queryRaw`SELECT "studioContext", "studioContextRevision" FROM "User" LIMIT 0`;
    return Response.json(
      { status: "ready" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
