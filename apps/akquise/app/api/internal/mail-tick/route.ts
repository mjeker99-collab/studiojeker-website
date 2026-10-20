import { timingSafeEqual } from "node:crypto";
import { runMailSchedule } from "../../../../lib/mail-schedule";
export const runtime = "nodejs";
export async function POST(req: Request) {
  const expected = process.env.INTERNAL_MAIL_TICK_TOKEN;
  const actual =
    req.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  if (
    !expected ||
    Buffer.byteLength(actual) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  )
    return new Response(null, { status: 401 });
  try {
    await runMailSchedule();
    return Response.json({ ok: true });
  } catch {
    console.error("Mail scheduler tick failed; no automatic SMTP retry.");
    return Response.json({ error: "Tick failed" }, { status: 500 });
  }
}
