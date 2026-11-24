import { timingSafeEqual } from "node:crypto";
import { leadResearchTick } from "../../../../lib/lead-research/service";

export const runtime = "nodejs";
export async function POST(req: Request) {
  const expected = process.env.LEAD_RESEARCH_TICK_TOKEN;
  const actual = req.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  if (
    !expected ||
    Buffer.byteLength(actual) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  ) {
    return new Response(null, { status: 401 });
  }
  try {
    const view = await leadResearchTick(null);
    return Response.json({
      ok: true,
      enabled: view.enabled,
      status: view.status,
      verifiedNew: view.metrics.verifiedNew,
      shortfall: view.metrics.shortfall,
      blockers: view.blockers.map((blocker) => blocker.id),
    });
  } catch {
    console.error("Lead-Recherche-Tick fehlgeschlagen. Kein Versand.");
    return Response.json({ error: "Tick fehlgeschlagen" }, { status: 500 });
  }
}
