import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { allowedAccount } from "@/lib/config.mjs";
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
    // Use only existing, active StudioONE accounts authorised by the same
    // production allowlist as the interactive Akquise workflow. If Martin
    // has not yet been provisioned, the already-authorised Nora account can
    // perform the additive import. Never create a user or bypass access rules.
    const allowedEmails = [process.env.MARTIN_EMAIL, process.env.NORA_EMAIL]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.trim().toLowerCase());
    if (!allowedEmails.length)
      return Response.json({ error: "Actor not configured" }, { status: 503 });
    const candidates = await db.user.findMany({
      where: { email: { in: allowedEmails }, active: true },
      select: { id: true, name: true, email: true, active: true },
    });
    const actor = allowedEmails
      .map((email) => candidates.find((candidate) =>
        candidate.email === email && allowedAccount(candidate)))
      .find((candidate) => Boolean(candidate));
    if (!actor) {
      console.error("Google master contact sync: no active authorised StudioONE account.");
      return Response.json({ error: "No authorised active StudioONE account" }, { status: 503 });
    }
    const contacts = await readSheetContacts(actor.id);
    const result = await importContacts(actor.id, contacts, { dedupeEmails: true });
    return Response.json({ ok: true, ...result }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    console.error("Google master contact sync failed; no email was sent.");
    return Response.json({ error: "Contact sync failed" }, { status: 500 });
  }
}
