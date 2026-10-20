import { z } from "zod";
import { db } from "./db";
import { allowedAccount, readMailConfig } from "./config.mjs";
import { PolicyError } from "./policy";
import { audit } from "./workflow";
import { checked, dispatchApproved } from "./delivery";
import { insideMailWindow, mailDayStart } from "./mail-clock";
import type { SmtpSender } from "./mail";

export const scheduleInput = z
  .object({
    revision: z.number().int().positive(),
    enabled: z.boolean(),
    dailyLimit: z.number().int().min(1).max(500),
    weekdaysOnly: z.boolean(),
    startHour: z.number().int().min(0).max(23),
    endHour: z.number().int().min(1).max(24),
    intervalMinutes: z.number().int().min(1).max(120),
    confirmDispatch: z.boolean(),
  })
  .strict()
  .refine(
    (v) => v.startHour < v.endHour,
    "Endzeit muss nach Startzeit liegen.",
  );
async function ensureSchedule() {
  return db.mailSchedule.upsert({
    where: { id: "studiojeker" },
    create: {},
    update: {},
  });
}
export async function mailScheduleState() {
  const schedule = await ensureSchedule();
  const config = readMailConfig();
  const [items, todayCount, counts] = await Promise.all([
    db.mailQueueItem.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
    db.delivery.count({
      where: { mode: "PRODUCTION", createdAt: { gte: mailDayStart() } },
    }),
    db.mailQueueItem.groupBy({ by: ["status"], _count: true }),
  ]);
  return {
    schedule,
    workerHealthy: Boolean(
      schedule.heartbeatAt &&
      Date.now() - schedule.heartbeatAt.getTime() <= 180000,
    ),
    items,
    todayCount,
    counts,
    serverLimit: config.dailyLimit,
    productionReady: config.smtpAllowed && config.mode === "production",
  };
}
export async function mailScheduleMutation(
  userId: string,
  action: string,
  body: unknown,
) {
  await ensureSchedule();
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('delivery-global'))`;
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user?.active || !allowedAccount(user))
        throw new PolicyError("Keine Berechtigung.", 403);
      const schedule = await tx.mailSchedule.findUniqueOrThrow({
        where: { id: "studiojeker" },
      });
      if (action === "pause") {
        await tx.mailSchedule.update({
          where: { id: schedule.id },
          data: {
            enabled: false,
            pauseReason: "Manuell pausiert",
            revision: { increment: 1 },
          },
        });
        await audit(tx, userId, "MAIL_SCHEDULE_PAUSED", schedule.id, {});
        return { ok: true };
      }
      if (action === "settings") {
        const { revision, confirmDispatch, ...data } =
          scheduleInput.parse(body);
        if (revision !== schedule.revision)
          throw new PolicyError("Zeitplan wurde geändert. Neu laden.", 409);
        const config = readMailConfig();
        if (
          data.enabled &&
          (!confirmDispatch ||
            !config.smtpAllowed ||
            config.mode !== "production")
        )
          throw new PolicyError(
            "Produktionsversand konfigurieren und automatischen Versand ausdrücklich bestätigen.",
          );
        if (data.enabled && data.dailyLimit > config.dailyLimit)
          throw new PolicyError(
            `Serverlimit beträgt ${config.dailyLimit}. DAILY_SEND_LIMIT zuerst anpassen.`,
          );
        if (
          data.enabled &&
          (await tx.mailQueueItem.count({
            where: { status: { in: ["SENDING", "UNKNOWN"] } },
          }))
        )
          throw new PolicyError(
            "Unklare Versandvorgänge zuerst manuell abgleichen.",
          );
        await tx.mailSchedule.update({
          where: { id: schedule.id },
          data: {
            ...data,
            activatedBy: data.enabled ? userId : schedule.activatedBy,
            pauseReason: null,
            revision: { increment: 1 },
          },
        });
        await audit(tx, userId, "MAIL_SCHEDULE_UPDATED", schedule.id, data);
        return { ok: true };
      }
      if (action === "enqueue") {
        const { items, confirmDispatch } = z
          .object({
            items: z
              .array(
                z
                  .object({
                    draftId: z.string(),
                    version: z.number().int().positive(),
                  })
                  .strict(),
              )
              .min(1)
              .max(200),
            confirmDispatch: z.literal(true),
          })
          .strict()
          .parse(body);
        const results: { draftId: string; ok: boolean; reason?: string }[] = [];
        for (const item of items) {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"contact:" + (await tx.draft.findUniqueOrThrow({ where: { id: item.draftId } })).contactId}))`;
          try {
            const { v } = await checked(tx, userId, item.draftId, item.version);
            if (
              await tx.delivery.findUnique({
                where: { idempotencyKey: `production:${v.recipient}` },
              })
            )
              throw new PolicyError("Bereits verarbeitet.");
            const existing = await tx.mailQueueItem.findUnique({
              where: { draftId_version: item },
            });
            if (existing && !["CANCELLED", "BLOCKED"].includes(existing.status))
              throw new PolicyError("Bereits eingeplant oder verarbeitet.");
            if (existing?.deliveryId)
              throw new PolicyError("Versandversuch bereits vorhanden.");
            const data = {
              ...item,
              hash: v.hash,
              recipient: v.recipient,
              subject: v.subject,
              userId,
              status: "QUEUED",
              error: null,
            };
            await tx.mailQueueItem.upsert({
              where: { draftId_version: item },
              create: data,
              update: data,
            });
            results.push({ draftId: item.draftId, ok: true });
          } catch (e) {
            if (!(e instanceof PolicyError)) throw e;
            results.push({
              draftId: item.draftId,
              ok: false,
              reason: e.message,
            });
          }
        }
        await audit(tx, userId, "MAIL_QUEUE_SELECTED", schedule.id, {
          results,
          confirmDispatch,
        });
        return { results };
      }
      if (action === "cancel") {
        const { id } = z.object({ id: z.string() }).strict().parse(body);
        const result = await tx.mailQueueItem.updateMany({
          where: { id, status: { in: ["QUEUED", "BLOCKED"] } },
          data: { status: "CANCELLED" },
        });
        if (!result.count)
          throw new PolicyError(
            "Versand bereits begonnen oder abgeschlossen.",
            409,
          );
        await audit(tx, userId, "MAIL_QUEUE_CANCELLED", id, {});
        return { ok: true };
      }
      if (action === "resolve") {
        const { id, rationale } = z
          .object({
            id: z.string(),
            rationale: z.string().trim().min(15).max(2000),
          })
          .strict()
          .parse(body);
        const item = await tx.mailQueueItem.findUniqueOrThrow({
          where: { id },
        });
        if (item.status !== "UNKNOWN")
          throw new PolicyError(
            "Nur unklare Versandvorgänge können abgeglichen werden.",
          );
        await tx.mailQueueItem.update({
          where: { id },
          data: {
            status: "CLOSED",
            error: `Manuell abgeglichen: ${rationale}`,
          },
        });
        // Delivery idempotency remains intact, regardless of the reconciliation outcome.
        await audit(tx, userId, "MAIL_QUEUE_RECONCILED_NO_RETRY", id, {
          rationale,
          deliveryId: item.deliveryId,
        });
        return { ok: true };
      }
      throw new PolicyError("Unbekannte Aktion.", 404);
    },
    { timeout: 35000 },
  );
}

// One item per tick. The durable claim + global delivery lock enforce spacing/limits
// even if multiple server instances tick concurrently. Never replay a claim.
export async function runMailSchedule(sender?: SmtpSender) {
  await ensureSchedule();
  await db.mailSchedule.update({
    where: { id: "studiojeker" },
    data: { heartbeatAt: new Date() },
  });
  const config = readMailConfig();
  const schedule = await db.mailSchedule.findUniqueOrThrow({
    where: { id: "studiojeker" },
  });
  if (
    await db.mailQueueItem.count({
      where: {
        status: "SENDING",
        updatedAt: { lt: new Date(Date.now() - 120000) },
      },
    })
  ) {
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('delivery-global'))`;
      const stale = await tx.mailQueueItem.findMany({
        where: {
          status: "SENDING",
          updatedAt: { lt: new Date(Date.now() - 120000) },
        },
      });
      if (!stale.length) return;
      await tx.delivery.updateMany({
        where: {
          id: {
            in: stale.flatMap((item) =>
              item.deliveryId ? [item.deliveryId] : [],
            ),
          },
          status: "SENDING",
        },
        data: {
          status: "UNKNOWN",
          error: "DISPATCH_INTERRUPTED_NO_RETRY",
          completedAt: new Date(),
        },
      });
      await tx.mailQueueItem.updateMany({
        where: {
          status: "SENDING",
          updatedAt: { lt: new Date(Date.now() - 120000) },
        },
        data: {
          status: "UNKNOWN",
          error:
            "Unterbrochener Versand. Manuell abgleichen; keine Wiederholung.",
        },
      });
      await tx.mailSchedule.update({
        where: { id: schedule.id },
        data: {
          enabled: false,
          pauseReason: "Unterbrochener Versand: Versandhistorie prüfen.",
          revision: { increment: 1 },
        },
      });
    });
    return;
  }
  if (
    !schedule.enabled ||
    !config.smtpAllowed ||
    config.mode !== "production" ||
    !insideMailWindow(schedule)
  )
    return;
  if (
    schedule.lastClaimAt &&
    Date.now() - schedule.lastClaimAt.getTime() <
      schedule.intervalMinutes * 60000
  )
    return;
  const count = await db.delivery.count({
    where: { mode: "PRODUCTION", createdAt: { gte: mailDayStart() } },
  });
  if (count >= Math.min(schedule.dailyLimit, config.dailyLimit)) return;
  const item = await db.mailQueueItem.findFirst({
    where: { status: "QUEUED" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  if (!item) return;
  try {
    await dispatchApproved(
      item.userId,
      item.draftId,
      item.version,
      sender,
      item.id,
    );
  } catch (e) {
    // A concurrent tick/pause or a just-reached quota is a defer, not a failed item.
    if (
      e instanceof PolicyError &&
      !/Zeitplan pausiert|Tageslimit/.test(e.message)
    ) {
      await db.mailQueueItem.updateMany({
        where: { id: item.id, status: "QUEUED" },
        data: { status: "BLOCKED", error: e.message },
      });
    } else if (!(e instanceof PolicyError)) throw e;
  }
}
