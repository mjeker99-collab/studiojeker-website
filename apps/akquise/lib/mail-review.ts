import { z } from "zod";
import type { SmtpSender } from "./mail";
import { dispatchApproved } from "./delivery";
import {
  explicitDispatchOutlook,
  explicitPlanMessage,
  mailScheduleMutation,
  runMailSchedule,
} from "./mail-schedule";
import { futureZurichInstant, formatZurich } from "./mail-clock";
import { db } from "./db";
import {
  legalAllowed,
  messageHash,
  PolicyError,
  verificationIssues,
} from "./policy";
import { appendMailContent, mailImageIds } from "./mail-content";
import { mailImageAttachments } from "./mail-images";
import {
  editDraft,
  reviewDraft,
  discardDrafts,
  correctNoraSender,
} from "./workflow";
import { assertNoraMailText, noraSenderText } from "./generation";

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
    const candidates = await db.draft.findMany({
      where: {
        id: { in: input.ids },
        versions: {
          some: { body: { contains: "Martin", mode: "insensitive" } },
        },
      },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });
    for (const d of candidates) {
      const body = d.versions[0]?.body;
      if (body && noraSenderText(body) !== body)
        await correctNoraSender(userId, d.id);
    }
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
        issues.push(
          error instanceof Error ? error.message : "Absendertext prüfen.",
        );
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
      const existingDelivery = await db.delivery.findFirst({
        where: {
          recipient: v.recipient,
          status: {
            in: ["SENT", "SENDING", "UNKNOWN", "SEND_READY", "REPLIED"],
          },
        },
      });
      const queued = await db.mailQueueItem.findFirst({
        where: {
          draftId: id,
          status: { in: ["QUEUED", "SENDING", "UNKNOWN"] },
        },
      });
      if (existingDelivery)
        issues.push("Bereits versandt oder Zustellung in Bearbeitung.");
      else if (queued)
        issues.push(
          "Bereits eingeplant. Nicht als neues Versandziel verwendbar.",
        );
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
        deliveryStatus: existingDelivery?.status ?? null,
        queueStatus: queued?.status ?? null,
        issues,
      });
    }
    return { rows, unavailable };
  }
  if (action === "revise") {
    const input = z
      .object({
        items: z
          .array(
            z
              .object({
                id: z.string().min(1).max(100),
                version: z.number().int().positive(),
              })
              .strict(),
          )
          .min(1)
          .max(200),
        find: z.string().max(500),
        append: z.string().trim().min(1).max(2000).optional(),
        replace: z.string().max(2000),
        confirmed: z.boolean(),
      })
      .strict()
      .parse(raw);
    if (!input.append && (!input.find || input.find === input.replace))
      throw new PolicyError("Der neue Text unterscheidet sich nicht.");
    const results = [];
    for (const entry of input.items) {
      try {
        const draft = await db.draft.findUnique({
          where: { id: entry.id },
          include: {
            contact: true,
            versions: { orderBy: { version: "desc" }, take: 1 },
          },
        });
        const v = draft?.versions[0];
        if (!draft || !v || draft.version !== entry.version)
          throw new PolicyError("Entwurf wurde geändert. Neu laden.", 409);
        const blocked = await db.mailQueueItem.findFirst({
          where: {
            draftId: draft.id,
            status: { in: ["QUEUED", "SENDING", "UNKNOWN"] },
          },
        });
        const sent = await db.delivery.findFirst({
          where: {
            recipient: v.recipient,
            status: {
              in: ["SENT", "SENDING", "UNKNOWN", "SEND_READY", "REPLIED"],
            },
          },
        });
        if (sent || blocked)
          throw new PolicyError(
            sent
              ? "Bereits versandt oder in Bearbeitung. Diese Mail wird nicht verändert."
              : "Bereits eingeplant. Diese Mail wird nicht als neues Versandziel verändert.",
          );
        if (
          !input.append &&
          !v.body.includes(input.find) &&
          !v.subject.includes(input.find)
        )
          throw new PolicyError(
            "Der gesuchte Text steht in dieser Mail nicht.",
          );
        const subject = input.append
          ? v.subject
          : v.subject.split(input.find).join(input.replace);
        const body = input.append
          ? appendMailContent(v.body, input.append)
          : v.body.split(input.find).join(input.replace);
        if (
          !subject.trim() ||
          subject.length > 250 ||
          !body.trim() ||
          body.length > 12000
        )
          throw new PolicyError(
            "Betreff oder Nachricht ist nach der Änderung ungültig.",
          );
        assertNoraMailText(body);
        if (!input.confirmed) {
          results.push({
            id: entry.id,
            ok: true,
            preview: true,
            subject,
            body,
            organisation: draft.contact.organisation,
            message: "Vorschau der Änderung",
          });
          continue;
        }
        await editDraft(userId, entry.id, entry.version, {
          recipient: v.recipient,
          subject,
          body,
        });
        results.push({
          id: entry.id,
          ok: true,
          subject,
          body,
          organisation: draft.contact.organisation,
          message: "Gespeichert. Die frühere Freigabe gilt nicht mehr.",
        });
      } catch (error) {
        results.push({
          id: entry.id,
          ok: false,
          message:
            error instanceof Error
              ? error.message
              : "Änderung nicht gespeichert",
        });
      }
    }
    return { results };
  }
  if (action === "approve-and-plan") {
    const input = z
      .object({
        items: z.array(item).min(1).max(200),
        read: z.literal(true),
        confirmDispatch: z.literal(true),
        mode: z.enum(["immediate", "scheduled"]),
        localDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        localTime: z
          .string()
          .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
          .optional(),
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
    let sendAfter: Date;
    try {
      sendAfter =
        input.mode === "scheduled"
          ? futureZurichInstant(input.localDate || "", input.localTime || "")
          : new Date();
    } catch (error) {
      throw new PolicyError(
        error instanceof Error ? error.message : "Zeitpunkt ungültig.",
      );
    }
    const results = [];
    for (const entry of input.items) {
      let approved = false;
      try {
        await reviewDraft(userId, entry.id, entry.version, "APPROVED", true, {
          ...entry,
          legal: input.legal,
        });
        approved = true;
        const queued = await mailScheduleMutation(userId, "enqueue", {
          confirmDispatch: true,
          sendAfter: sendAfter.toISOString(),
          items: [{ draftId: entry.id, version: entry.version }],
        });
        const result = "results" in queued ? queued.results?.[0] : undefined;
        results.push({
          id: entry.id,
          ok: Boolean(result?.ok),
          message: result?.ok
            ? "Freigegeben und eingeplant"
            : `Freigegeben; nicht eingeplant: ${result?.reason || "Status prüfen"}`,
        });
      } catch (error) {
        results.push({
          id: entry.id,
          ok: false,
          stopBatch: approved || !(error instanceof PolicyError),
          message:
            error instanceof PolicyError
              ? error.message
              : "Freigabe fehlgeschlagen. Vorschau neu laden.",
        });
      }
    }
    const queuedIds = results
      .filter((result) => result.ok)
      .map((result) => result.id);
    if (input.mode === "immediate" && queuedIds.length) {
      try {
        await runMailSchedule(sender, { explicitOnly: true });
      } catch {
        /* The queue remains. The summary reports that nothing new was handed off. */
      }
    }
    const started = queuedIds.length
      ? await db.mailQueueItem.count({
          where: {
            draftId: { in: queuedIds },
            status: { in: ["SENT", "SENDING", "TEST_SENT"] },
          },
        })
      : 0;
    const waiting = queuedIds.length
      ? await db.mailQueueItem.count({
          where: { draftId: { in: queuedIds }, status: "QUEUED" },
        })
      : 0;
    const queued = started + waiting;
    const outlook = await explicitDispatchOutlook();
    const when = input.mode === "scheduled" ? sendAfter : null;
    return {
      results,
      summary: {
        queued,
        started,
        failed: results.length - queued,
        mode: input.mode,
        when: when?.toISOString() ?? null,
        whenLabel: when ? `${formatZurich(when)} Uhr (Europe/Zurich)` : null,
        nextAt: outlook.next.toISOString(),
        capped: outlook.capped,
        message: explicitPlanMessage({
          queued,
          started,
          failed: results.length - queued,
          mode: input.mode,
          when,
          outlook,
        }),
      },
    };
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
