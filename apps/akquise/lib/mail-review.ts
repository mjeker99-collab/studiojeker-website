import { z } from "zod";
import type { SmtpSender } from "./mail";
import { dispatchApproved } from "./delivery";
import { mailScheduleMutation } from "./mail-schedule";
import { db } from "./db";
import {
  legalAllowed,
  messageHash,
  PolicyError,
  verificationIssues,
} from "./policy";
import { appendMailContent, mailImageIds } from "./mail-content";
import { mailImageAttachments } from "./mail-images";
import { editDraft, reviewDraft, discardDrafts } from "./workflow";
import { assertNoraMailText } from "./generation";

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
export async function mailReview(
  userId: string,
  action: string,
  raw: unknown,
  sender?: SmtpSender,
) {
  if (action === "discard") {
    const input = z
      .object({
        confirmed: z.literal(true),
        items: z
          .array(
            z
              .object({
                id: z.string().min(1),
                version: z.number().int().positive(),
              })
              .strict(),
          )
          .min(1)
          .max(200),
      })
      .strict()
      .parse(raw);
    const result = await discardDrafts(userId, input.items);
    return { results: result.results };
  }
  if (action === "content") {
    const input = z
      .object({
        items: z
          .array(
            z
              .object({ id: z.string(), version: z.number().int().positive() })
              .strict(),
          )
          .min(1)
          .max(200),
        content: z.string().trim().min(1).max(4000),
      })
      .strict()
      .parse(raw);
    await mailImageAttachments(input.content);
    const results = [];
    for (const entry of input.items) {
      try {
        const v = await db.draftVersion.findUniqueOrThrow({
          where: {
            draftId_version: { draftId: entry.id, version: entry.version },
          },
        });
        const body = appendMailContent(v.body, input.content);
        if (body.length > 12000)
          throw new PolicyError("Mail ist zu lang. Bitte den Text kürzen.");
        if (mailImageIds(body).length > 3)
          throw new PolicyError("Maximal drei Bilder pro Mail verwenden.");
        await editDraft(userId, entry.id, entry.version, {
          recipient: v.recipient,
          subject: v.subject,
          body,
        });
        results.push({
          id: entry.id,
          ok: true,
          message: "Bilder und Links gespeichert",
        });
      } catch (e) {
        results.push({
          id: entry.id,
          ok: false,
          message:
            e instanceof Error ? e.message : "Ergänzung nicht gespeichert",
        });
      }
    }
    return { results };
  }
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
    const rows = [];
    const unavailable: { id: string; message: string }[] = [];
    for (const id of input.ids) {
      const d = drafts.find((d) => d.id === id);
      const v = d?.versions[0];
      if (!d || !v) {
        unavailable.push({
          id,
          message: !d
            ? "Entwurf nicht mehr vorhanden. Aus der Auswahl entfernt."
            : "Nachrichtenversion fehlt. Entwurf erneut erstellen.",
        });
        continue;
      }
      const issues = verificationIssues(d.contact);
      try {
        assertNoraMailText(v.body);
      } catch (error) {
        issues.push(error instanceof Error ? error.message : "Absendertext prüfen.");
      }
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
        contactId: d.contactId,
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
    return { rows, unavailable };
  }
  if (
    action === "approve" ||
    action === "approve-and-enqueue" ||
    action === "approve-and-start" ||
    action === "approve-and-send"
  ) {
    const input = z
      .object({
        items: z
          .array(item)
          .min(1)
          .max(200)
          .refine((a) => new Set(a.map((i) => i.id)).size === a.length),
        read: z.literal(true),
        confirmDispatch: z.literal(true).optional(),
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
    if (action !== "approve" && !input.confirmDispatch)
      throw new PolicyError("Automatischen Versand ausdrücklich bestätigen.");
    if (action === "approve-and-send" && input.items.length !== 1)
      throw new PolicyError("Sofortversand erfolgt einzeln pro Nachricht.");
    if (action === "approve-and-start")
      await mailScheduleMutation(userId, "check-start", {
        confirmDispatch: true,
      });
    const results = [];
    for (const entry of input.items) {
      let approved = false;
      try {
        await reviewDraft(userId, entry.id, entry.version, "APPROVED", true, {
          ...entry,
          legal: input.legal,
        });
        approved = true;
        if (action === "approve-and-send") {
          const { delivery } = await dispatchApproved(
            userId,
            entry.id,
            entry.version,
            sender,
          );
          const ok =
            delivery.status === "SENT" || delivery.status === "TEST_SENT";
          results.push({
            id: entry.id,
            ok,
            stopBatch: !ok,
            message:
              delivery.status === "SENT"
                ? "An Mailserver übergeben"
                : delivery.status === "TEST_SENT"
                  ? "Testmail an Testempfänger übergeben"
                  : "Versand nicht bestätigt. Versandhistorie prüfen; keine automatische Wiederholung.",
          });
        } else if (
          action === "approve-and-enqueue" ||
          action === "approve-and-start"
        ) {
          try {
            const queued = await mailScheduleMutation(userId, "enqueue", {
              confirmDispatch: true,
              items: [{ draftId: entry.id, version: entry.version }],
            });
            const result =
              "results" in queued ? queued.results?.[0] : undefined;
            results.push({
              id: entry.id,
              ok: Boolean(result?.ok),
              message: result?.ok
                ? "Freigegeben und eingeplant"
                : `Freigegeben; nicht eingeplant: ${result?.reason || "Status prüfen"}`,
            });
          } catch {
            results.push({
              id: entry.id,
              ok: false,
              message:
                "Freigegeben; Einplanung nicht bestätigt. Versandstatus prüfen, bevor erneut eingeplant wird.",
            });
          }
        } else results.push({ id: entry.id, ok: true, message: "Freigegeben" });
      } catch (e) {
        results.push({
          id: entry.id,
          ok: false,
          // Only a known pre-send review rejection is safe to skip.
          // Transport errors, limits and uncertain delivery stop the group.
          stopBatch:
            approved || !(e instanceof PolicyError) || e.status === 403,
          message:
            e instanceof PolicyError
              ? e.message
              : "Freigabe fehlgeschlagen. Vorschau neu laden.",
        });
      }
    }
    let notice = "";
    if (action === "approve-and-start" && results.some((r) => r.ok)) {
      try {
        await mailScheduleMutation(userId, "start", { confirmDispatch: true });
      } catch (e) {
        notice = `Mails sind eingeplant; Start nicht bestätigt: ${e instanceof Error ? e.message : "Versandstatus prüfen."}`;
      }
    }
    return { results, notice };
  }
  throw new PolicyError("Unbekannte Prüfaktion.", 404);
}
