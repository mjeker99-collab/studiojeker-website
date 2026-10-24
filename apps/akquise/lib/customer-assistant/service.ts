import { Prisma } from "@prisma/client";
import { db } from "../db";
import { hubActor } from "../hub/workflow";
import { PolicyError } from "../policy";
import { ORG } from "../studio/input";
import { studioConfig } from "../studio/config";
import { ProviderFailure } from "../studio/provider";
import { audit } from "../workflow";
import { assistantInput } from "./input";
import { generateCustomerKnowledge } from "./provider";
const json = (v: unknown) =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const kind = "CUSTOMER_RESEARCH";
export async function assistCustomer(
  actor: string,
  raw: unknown,
  provider = generateCustomerKnowledge,
) {
  const input = assistantInput.parse(raw);
  const config = studioConfig();
  const reservation = await db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"studio-jobs:" + ORG}))`;
    const existing = await tx.studioJob.findUnique({
      where: { requestKey: input.requestKey },
    });
    if (existing) {
      if (
        existing.organizationId !== ORG ||
        existing.userId !== actor ||
        existing.kind !== kind ||
        JSON.stringify(assistantInput.parse(existing.input)) !==
          JSON.stringify(input)
      )
        throw new PolicyError(
          "Auftragsschlüssel bereits anders verwendet.",
          409,
        );
      if (existing.status === "SUCCEEDED")
        return { cached: existing.result, job: existing };
      throw new PolicyError(
        existing.error ||
          "Recherche läuft oder wurde bereits gestartet. Keine automatische Wiederholung.",
        409,
      );
    }
    if (!config.connected)
      throw new PolicyError(
        "GPT ist nicht verbunden. Bitte die KI-Verbindung in den Einstellungen prüfen.",
        503,
      );
    await tx.studioJob.updateMany({
      where: {
        organizationId: ORG,
        kind,
        status: "RUNNING",
        startedAt: { lt: new Date(Date.now() - 180000) },
      },
      data: {
        status: "UNKNOWN",
        error:
          "Recherche unterbrochen. Ergebnis/Kosten unklar; keine automatische Wiederholung.",
        completedAt: new Date(),
      },
    });
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const jobs = await tx.studioJob.findMany({
      where: { organizationId: ORG, createdAt: { gte: since } },
      select: { reserveUsd: true },
    });
    const reserveUsd = config.textReserve * (input.mode === "RESEARCH" ? 3 : 1);
    if (
      jobs.length >= config.dailyRequests ||
      jobs.reduce((sum, job) => sum + job.reserveUsd, 0) + reserveUsd >
        config.dailyBudget + 1e-9
    )
      throw new PolicyError(
        "Tageslimit für Aufträge/Budgetreservierungen erreicht.",
        429,
      );
    if (
      await tx.studioJob.count({
        where: { organizationId: ORG, status: { in: ["QUEUED", "RUNNING"] } },
      })
    )
      throw new PolicyError(
        "Ein KI-Auftrag wartet oder läuft bereits. Bitte zuerst abschliessen.",
        409,
      );
    const job = await tx.studioJob.create({
      data: {
        organizationId: ORG,
        requestKey: input.requestKey,
        kind,
        status: "RUNNING",
        input: json(input),
        model: config.textModel,
        reserveUsd,
        userId: actor,
        startedAt: new Date(),
      },
    });
    await audit(tx, actor, "CUSTOMER_ASSISTANT_STARTED", job.id, {
      mode: input.mode,
    });
    return { cached: null, job };
  });
  if (reservation.cached) return reservation.cached;
  try {
    const response = await provider(input, reservation.job.model);
    await db.studioJob.update({
      where: { id: reservation.job.id },
      data: {
        status: "SUCCEEDED",
        result: json(response.result),
        usage: json(response.usage),
        providerRequestId: response.requestId,
        completedAt: new Date(),
      },
    });
    return response.result;
  } catch (e) {
    const uncertain = !(e instanceof ProviderFailure) || e.uncertain;
    const error =
      e instanceof ProviderFailure
        ? e.message
        : "Recherche unterbrochen. Ergebnis/Kosten unklar; keine automatische Wiederholung.";
    await db.studioJob.updateMany({
      where: { id: reservation.job.id, status: "RUNNING" },
      data: {
        status: uncertain ? "UNKNOWN" : "FAILED",
        error,
        completedAt: new Date(),
      },
    });
    throw new PolicyError(error, 502);
  }
}
