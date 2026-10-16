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
type Tx = Prisma.TransactionClient;
async function locks(tx: Tx, contactId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('delivery-global'))`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"contact:" + contactId}))`;
}
async function checked(
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
) {
  const config = readMailConfig();
  if (!config.smtpAllowed)
    throw new PolicyError("Externer E-Mail-Versand ist deaktiviert.", 403);
  const mode = config.mode === "test" ? "TEST" : "PRODUCTION";
  const initial = await db.draft.findUniqueOrThrow({ where: { id: draftId } });
  const claim = await db.$transaction(
    async (tx) => {
      await locks(tx, initial.contactId);
      const { v } = await checked(tx, userId, draftId, version);
      const key =
        mode === "TEST"
          ? `test:${draftId}:${version}`
          : `production:${v.recipient}`;
      const prior = await tx.delivery.findUnique({
        where: { idempotencyKey: key },
      });
      if (prior) return { delivery: prior, reused: true };
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
      const since = new Date();
      since.setUTCHours(0, 0, 0, 0);
      if (
        (await tx.delivery.count({
          where: { mode, createdAt: { gte: since } },
        })) >= config.dailyLimit
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
    await audit(db, userId, "DELIVERY_UNKNOWN", delivery.id, {
      reason: "Interrupted; manual reconciliation required",
    });
    return { delivery, reused: false };
  }
}
