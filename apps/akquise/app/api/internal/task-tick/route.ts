import { timingSafeEqual } from "node:crypto";
import { runTaskWorker } from "../../../../lib/tasks/engine";

export const runtime = "nodejs";
export async function POST(req: Request) {
  const expected = process.env.INTERNAL_MAIL_TICK_TOKEN;
  const actual = req.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  if (
    !expected ||
    Buffer.byteLength(actual) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  )
    return new Response(null, { status: 401 });
  try {
    const ids = await runTaskWorker("production-tick");
    return Response.json({ ok: true, claimed: ids.length });
  } catch {
    console.error("GPT task tick failed; the order stays saved for the next tick.");
    return Response.json({ error: "Tick failed" }, { status: 500 });
  }
}
