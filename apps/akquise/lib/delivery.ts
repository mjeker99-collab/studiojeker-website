import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { allowedAccount, readMailConfig } from "./config.mjs";
import {
  PolicyError,
  verifiedContact,
  legalAllowed,
  messageHash,
} from "./policy";
import { smtpSender, type SmtpSender } from "./mail";
import { audit } from "./workflow";
import { insideMailWindow, mailDayStart } from "./mail-clock";
type Tx = Prisma.TransactionClient;
async function locks(tx: Tx, contactId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('delivery-global'))`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"contact:" + contactId}))`;
}
export async function checked(
  tx: Tx,
  userId: string,
  draftId: string,
  version: number,
) {
  const user = await tx.user.findFirst({ where: { id: userId, active: true } });
  if (!user || !allowedAccount(user))
    throw new PolicyError("Keine Berechtigung.", 403);
  const d = await tx.draft.findUniqueOrThrow({
    where: { id: draftId },
    include: { contact: true },
  });
  const v = await tx.draftVersion.findUniqueOrThrow({
    where: { draftId_version: { draftId, version } },
  });
  if (
    d.version !== version ||
    v.contactRevision !== d.contact.revision ||
    v.recipient !== d.contact.email ||
    v.hash !== messageHash(v.recipient, v.subject, v.body)
  )
    throw new PolicyError("Kontakt oder Nachrichtenversion geändert.", 409);
  verifiedContact(d.contact);
  if (await tx.suppression.findUnique({ where: { email: v.recipient } }))
    throw new PolicyError("Adresse auf Sperrliste.");
  const approval = await tx.approval.findFirst({
    where: { draftId, version, hash: v.hash, status: "APPROVED" },
    include: { user: true },
  });
  if (!approval?.user.active || !allowedAccount(approval.user))
    throw new PolicyError("Freigabe der exakten Version fehlt.");
  const legal = await tx.legalReview.findFirst({
    where: { contactId: d.contactId },
    orderBy: { createdAt: "desc" },
  });
  legalAllowed(legal, d.contact.revision, d.contact.publicAuthority);
  return { d, v };
}
// A durable SENDING claim is committed BEFORE network I/O. Crashes never cause automatic retry.
// During dispatch the contact lock prevents content, approval or suppression changes racing the send.
export async function dispatchApproved(
  userId: string,
  draftId: string,
  version: number,
  sender: SmtpSender = smtpSender,
  queueId?: string,
) {
  const config = readMailConfig();
  if (!config.smtpAllowed)
    throw new PolicyError("Externer E-Mail-Versand ist deaktiviert.", 403);
  const mode = config.mode === "test" ? "TEST" : "PRODUCTION";
  const initial = await db.draft.findUniqueOrThrow({ where: { id: draftId } });
  const claim = await db.$transaction(
    async (tx) => {
      await locks(tx, initial.contactId);
      const now = new Date();
      let schedule;
      if (queueId) {
        schedule = await tx.mailSchedule.findUniqueOrThrow({
          where: { id: "studiojeker" },
        });
        const item = await tx.mailQueueItem.findUniqueOrThrow({
          where: { id: queueId },
        });
        if (
          !schedule.enabled ||
          mode !== "PRODUCTION" ||
          !insideMailWindow(schedule, now) ||
          item.status !== "QUEUED" ||
          item.draftId !== draftId ||
          item.version !== version ||
          item.userId !== userId ||
          (schedule.lastClaimAt &&
            now.getTime() - schedule.lastClaimAt.getTime() <
              schedule.intervalMinutes * 60000)
        )
          throw new PolicyError(
            "Zeitplan pausiert, ausserhalb Versandzeit oder bereits bearbeitet.",
            409,
          );
        const activator = schedule.activatedBy
          ? await tx.user.findUnique({ where: { id: schedule.activatedBy } })
          : null;
        if (!activator?.active || !allowedAccount(activator))
          throw new PolicyError(
            "Aktivierung durch berechtigte Person fehlt.",
            403,
          );
      }
      const { v } = await checked(tx, userId, draftId, version);
      if (queueId) {
        const item = await tx.mailQueueItem.findUniqueOrThrow({
          where: { id: queueId },
        });
        if (item.hash !== v.hash)
          throw new PolicyError("Eingeplante Nachricht geändert.", 409);
      }
      const key =
        mode === "TEST"
          ? `test:${draftId}:${version}`
          : `production:${v.recipient}`;
      const prior = await tx.delivery.findUnique({
        where: { idempotencyKey: key },
      });
      if (prior) {
        if (queueId)
          await tx.mailQueueItem.update({
            where: { id: queueId },
            data: {
              status: "SKIPPED",
              error: "Bereits verarbeitet; kein erneuter Versand.",
              deliveryId: prior.id,
            },
          });
        return { delivery: prior, reused: true };
      }
      if (
        mode === "PRODUCTION" &&
        (await tx.delivery.findFirst({
          where: {
            recipient: v.recipient,
            status: {
              in: ["SENT", "REPLIED", "SEND_READY", "SENDING", "UNKNOWN"],
            },
            mode: { in: ["LOCAL", "PRODUCTION"] },
          },
        }))
      )
        throw new PolicyError("Doppelversand blockiert.", 409);
      const since = mailDayStart(now);
      if (
        (await tx.delivery.count({
          where: { mode, createdAt: { gte: since } },
        })) >=
        Math.min(config.dailyLimit, schedule?.dailyLimit ?? config.dailyLimit)
      )
        throw new PolicyError("Tageslimit erreicht.");
      const delivery = await tx.delivery.create({
        data: {
          draftId,
          version,
          recipient: v.recipient,
          hash: v.hash,
          status: "SENDING",
          mode,
          envelopeRecipients:
            mode === "TEST" ? config.testRecipients : [v.recipient],
          messageId: `<${randomUUID()}@studiojeker.ch>`,
          idempotencyKey: key,
        },
      });
      if (queueId) {
        await tx.mailQueueItem.update({
          where: { id: queueId },
          data: { status: "SENDING", deliveryId: delivery.id },
        });
        await tx.mailSchedule.update({
          where: { id: "studiojeker" },
          data: { lastClaimAt: now },
        });
      }
      await audit(tx, userId, "DELIVERY_CLAIMED", delivery.id, {
        mode,
        version,
        hash: v.hash,
      });
      return { delivery, reused: false };
    },
    { timeout: 35000 },
  );
  if (claim.reused) return claim;
  try {
    return await db.$transaction(
      async (tx) => {
        await locks(tx, initial.contactId);
        const currentConfig = readMailConfig();
        if (!currentConfig.smtpAllowed || currentConfig.mode !== config.mode)
          throw new PolicyError("Versandkonfiguration geändert.");
        if (queueId) {
          const schedule = await tx.mailSchedule.findUniqueOrThrow({
            where: { id: "studiojeker" },
          });
          if (!schedule.enabled || !insideMailWindow(schedule))
            throw new PolicyError("Automatik pausiert.");
          const activator = schedule.activatedBy
            ? await tx.user.findUnique({ where: { id: schedule.activatedBy } })
            : null;
          if (!activator?.active || !allowedAccount(activator))
            throw new PolicyError("Aktivierung ungültig.");
        }
        const { d, v } = await checked(tx, userId, draftId, version);
        let status: "SENT" | "TEST_SENT" | "FAILED" | "UNKNOWN",
          error: string | null = null;
        try {
          const result = await sender({
            ...v,
            messageId: claim.delivery.messageId,
            envelopeRecipients: claim.delivery.envelopeRecipients,
            test: mode === "TEST",
          });
          if (
            result.accepted.length ===
              claim.delivery.envelopeRecipients.length &&
            result.rejected.length === 0
          )
            status = mode === "TEST" ? "TEST_SENT" : "SENT";
          else {
            status = result.accepted.length ? "UNKNOWN" : "FAILED";
            error = result.accepted.length
              ? "PARTIAL_ACCEPTANCE_NO_RETRY"
              : "RECIPIENT_REJECTED_NO_RETRY";
          }
        } catch {
          status = "UNKNOWN";
          error = "SMTP_RESULT_UNCERTAIN_NO_RETRY";
        }
        const delivery = await tx.delivery.update({
          where: { id: claim.delivery.id },
          data: { status, error, completedAt: new Date() },
        });
        if (queueId) {
          await tx.mailQueueItem.update({
            where: { id: queueId },
            data: { status, error },
          });
          if (status !== "SENT")
            await tx.mailSchedule.update({
              where: { id: "studiojeker" },
              data: {
                enabled: false,
                pauseReason:
                  "Versandfehler: Versandhistorie prüfen. Keine automatische Wiederholung.",
                revision: { increment: 1 },
              },
            });
        }
        if (mode === "PRODUCTION")
          await tx.contact.update({
            where: { id: d.contactId },
            data: { status: status === "SENT" ? "SENT" : "FAILED" },
          });
        await audit(tx, userId, "DELIVERY_" + status, delivery.id, {
          mode,
          messageId: delivery.messageId,
          error,
        });
        return { delivery, reused: false };
      },
      { timeout: 35000 },
    );
  } catch {
    // Preflight failure or transaction failure: preserve claim, conservatively block further attempts.
    const delivery = await db.delivery.update({
      where: { id: claim.delivery.id },
      data: {
        status: "UNKNOWN",
        error: "DISPATCH_INTERRUPTED_NO_RETRY",
        completedAt: new Date(),
      },
    });
    if (queueId)
      await db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('delivery-global'))`;
        await tx.mailQueueItem.update({
          where: { id: queueId },
          data: {
            status: "UNKNOWN",
            error:
              "Versand unterbrochen. Manuell abgleichen; keine Wiederholung.",
          },
        });
        await tx.mailSchedule.update({
          where: { id: "studiojeker" },
          data: {
            enabled: false,
            pauseReason: "Unklarer Versandstatus. Versandhistorie prüfen.",
            revision: { increment: 1 },
          },
        });
      });
    await audit(db, userId, "DELIVERY_UNKNOWN", delivery.id, {
      reason: "Interrupted; manual reconciliation required",
    });
    return { delivery, reused: false };
  }
}
