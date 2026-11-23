import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { mailchimpConfiguration, mailchimpEndpoint } from "@/lib/hub/mailchimp";
import { z } from "zod";

export const dynamic = "force-dynamic";

const input = z.object({ transferId: z.string().cuid() }).strict();

/** Only test the approved, already transferred Mailchimp draft to the signed-in editor. */
export async function POST(request: Request) {
  let user: Awaited<ReturnType<typeof requireUser>>;
  try { user = await requireUser(); }
  catch { return Response.json({ error: "Bitte anmelden." }, { status: 401 }); }
  const payload = input.safeParse(await request.json().catch(() => null));
  if (!payload.success) return Response.json({ error: "Ungültige Übertragung." }, { status: 400 });
  const transfer = await db.mailchimpTransfer.findUnique({
    where: { id: payload.data.transferId },
    include: { content: true },
  });
  if (!transfer || transfer.status !== "DRAFT" || !transfer.remoteId || transfer.content.kind !== "NEWSLETTER")
    return Response.json({ error: "Nur vollständig nach Mailchimp übertragene Newsletter-Entwürfe können getestet werden." }, { status: 409 });
  // Test messages go to the current signed-in user only, never to a whole audience.
  const recipient = user.email;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))
    return Response.json({ error: "Benutzerkonto benötigt eine gültige Testadresse." }, { status: 400 });
  const cfg = mailchimpConfiguration();
  if (!cfg.ok) return Response.json({ error: "Mailchimp ist nicht verbunden." }, { status: 503 });
  try {
    const response = await fetch(mailchimpEndpoint(cfg.serverPrefix, `/campaigns/${encodeURIComponent(transfer.remoteId)}/actions/test`), {
      method: "POST",
      headers: {
        Authorization: cfg.authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ test_emails: [recipient], send_type: "html" }),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      return Response.json({ error: `Mailchimp-Testmail konnte nicht ausgelöst werden (HTTP ${response.status}).` }, { status: 502 });
    }
    await db.audit.create({ data: { userId: user.id, action: "MAILCHIMP_TEST_REQUESTED", entityId: transfer.contentId, detail: { transferId: transfer.id, version: transfer.version, recipient: user.email } } });
    return Response.json({ requested: true, recipient, notice: "Mailchimp hat die Testmail angenommen. Bitte Posteingang und Links kontrollieren." });
  } catch {
    return Response.json({ error: "Mailchimp ist gerade nicht erreichbar." }, { status: 502 });
  }
}
