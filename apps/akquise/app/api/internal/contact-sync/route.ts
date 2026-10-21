import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { readSheetContacts } from "@/lib/sheets";
import { importContacts } from "@/lib/workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Dedicated secret, distinct from the SMTP scheduler token.
// The endpoint only adds missing contacts; it cannot approve or send messages.
export async function POST(req: Request) {
  const expected = process.env.INTERNAL_CONTACT_SYNC_TOKEN ?? "";
  const actual = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!expected || Buffer.byteLength(expected) !== Buffer.byteLength(actual) ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) {
    return new Response(null, { status: 401 });
  }
  try {
    const email = process.env.MARTIN_EMAIL;
    if (!email) return Response.json({ error: "Actor not configured" }, { status: 503 });
    const actor = await db.user.findUnique({ where: { email }, select: { id: true, active: true } });
    if (!actor?.active) return Response.json({ error: "Actor unavailable" }, { status: 503 });
    const contacts = await readSheetContacts();
    const result = await importContacts(actor.id, contacts);
    return Response.json({ ok: true, ...result }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    console.error("Google master contact sync failed; no email was sent.");
    return Response.json({ error: "Contact sync failed" }, { status: 500 });
  }
}
