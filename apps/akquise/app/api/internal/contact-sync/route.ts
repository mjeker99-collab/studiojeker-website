import { timingSafeEqual } from "node:crypto";
import { contactSyncFailure } from "@/lib/drive/access-error";
import { designatedMasterlistActor } from "@/lib/drive/service";
import { masterlistActorOrder } from "@/lib/masterlist-actor";
import { PolicyError } from "@/lib/policy";
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
    // One designated account owns the master-list Drive folder. A failed
    // grant does not continue with the other account or another spreadsheet.
    if (!masterlistActorOrder().length)
      return Response.json({ error: "Actor not configured" }, { status: 503 });
    const actor = await designatedMasterlistActor();
    if (!actor) {
      console.error("Google master contact sync: no active authorised StudioONE account.");
      return Response.json({ error: "No authorised active StudioONE account" }, { status: 503 });
    }
    const contacts = await readSheetContacts(actor.id);
    const result = await importContacts(actor.id, contacts, { dedupeEmails: true });
    return Response.json({ ok: true, ...result }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    // Restricted diagnostics: expose only our own policy messages or error
    // class names, never OAuth tokens, remote response bodies or contact data.
    const cause = error instanceof PolicyError
      ? `PolicyError: ${error.message.slice(0, 240)}`
      : error instanceof Error && /^Masterliste(?: Zeile \d+)?: /.test(error.message)
        ? error.message.slice(0, 240)
        : error instanceof Error
          ? error.name
          : "unknown";
    const failure = contactSyncFailure(error);
    console.error(`Google master contact sync failed: ${cause}; designated account only; no email was sent.`);
    return Response.json(
      { error: "Contact sync failed", reason: failure.reason },
      { status: failure.status },
    );
  }
}
