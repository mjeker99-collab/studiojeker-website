import { z } from "zod";
import { db } from "./db";
import {
  legalAllowed,
  messageHash,
  PolicyError,
  verificationIssues,
} from "./policy";
import { reviewDraft } from "./workflow";

const ids = z
  .array(z.string().min(1).max(100))
  .min(1)
  .max(200)
  .refine((items) => new Set(items).size === items.length, "Doppelte Auswahl.");
const item = z
  .object({
    id: z.string().min(1).max(100),
    version: z.number().int().positive(),
    hash: z.string().regex(/^[a-f0-9]{64}$/),
    contactRevision: z.number().int().positive(),
  })
  .strict();
export async function mailReview(userId: string, action: string, raw: unknown) {
  if (action === "preview") {
    const input = z.object({ ids }).strict().parse(raw);
    const drafts = await db.draft.findMany({
      where: { id: { in: input.ids } },
      include: {
        contact: {
          include: {
            legalReviews: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
        versions: { orderBy: { version: "desc" }, take: 1 },
      },
    });
    if (drafts.length !== input.ids.length)
      throw new PolicyError("Entwurf nicht mehr vorhanden. Neu laden.", 409);
    const rows = [];
    for (const id of input.ids) {
      const d = drafts.find((d) => d.id === id)!;
      const v = d.versions[0];
      if (!v) throw new PolicyError("Nachrichtenversion fehlt.");
      const issues = verificationIssues(d.contact);
      if (
        v.contactRevision !== d.contact.revision ||
        v.recipient !== d.contact.email
      )
        issues.push("Kontakt geändert. Nachricht als neue Version speichern.");
      if (v.hash !== messageHash(v.recipient, v.subject, v.body))
        issues.push("Signatur geändert. Nachricht als neue Version speichern.");
      if (await db.suppression.findUnique({ where: { email: v.recipient } }))
        issues.push("Adresse auf Sperrliste.");
      if (
        await db.delivery.findFirst({
          where: {
            recipient: v.recipient,
            status: {
              in: ["SENT", "SENDING", "UNKNOWN", "SEND_READY", "REPLIED"],
            },
          },
        })
      )
        issues.push("Bereits versandt oder Zustellung in Bearbeitung.");
      let needsLegal = false;
      try {
        legalAllowed(
          d.contact.legalReviews[0] ?? null,
          d.contact.revision,
          d.contact.publicAuthority,
        );
      } catch {
        needsLegal = true;
      }
      rows.push({
        id,
        version: d.version,
        hash: v.hash,
        contactRevision: d.contact.revision,
        recipient: v.recipient,
        subject: v.subject,
        body: v.body,
        organisation: d.contact.organisation,
        publicAuthority: d.contact.publicAuthority,
        needsLegal,
        issues,
      });
    }
    return { rows };
  }
  if (action === "approve") {
    const input = z
      .object({
        items: z
          .array(item)
          .min(1)
          .max(200)
          .refine((a) => new Set(a.map((i) => i.id)).size === a.length),
        read: z.literal(true),
        legal: z
          .object({
            confirmed: z.literal(true),
            rationale: z.string().trim().min(15).max(4000),
            procurementReviewed: z.boolean(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .parse(raw);
    const results = [];
    for (const entry of input.items) {
      try {
        await reviewDraft(userId, entry.id, entry.version, "APPROVED", true, {
          ...entry,
          legal: input.legal,
        });
        results.push({ id: entry.id, ok: true, message: "Freigegeben" });
      } catch (e) {
        results.push({
          id: entry.id,
          ok: false,
          message:
            e instanceof PolicyError
              ? e.message
              : "Freigabe fehlgeschlagen. Vorschau neu laden.",
        });
      }
    }
    return { results };
  }
  throw new PolicyError("Unbekannte Prüfaktion.", 404);
}
