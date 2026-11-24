import { Prisma } from "@prisma/client";
import { db } from "../db";
import { ORG } from "../studio/input";
import type { LeadStore } from "./pipeline";
import type { JobRecord } from "./types";

function fromRow(row: {
  id: string;
  idempotencyKey: string;
  dayKey: string;
  status: string;
  revision: number;
  leaseOwner: string;
  leaseUntil: Date | null;
  state: Prisma.JsonValue;
}): JobRecord {
  const state = row.state as unknown as JobRecord;
  return {
    ...state,
    id: row.id,
    idempotencyKey: row.idempotencyKey,
    dayKey: row.dayKey,
    status: row.status as JobRecord["status"],
    revision: row.revision,
    leaseOwner: row.leaseOwner,
    leaseUntil: row.leaseUntil ? row.leaseUntil.toISOString() : null,
  };
}

export class PrismaLeadStore implements LeadStore {
  async get(id: string) {
    const row = await db.leadResearchJob.findUnique({ where: { id } });
    return row ? fromRow(row) : null;
  }
  async getByKey(key: string) {
    const row = await db.leadResearchJob.findUnique({ where: { idempotencyKey: key } });
    return row ? fromRow(row) : null;
  }
  async listDay(dayKey: string) {
    const rows = await db.leadResearchJob.findMany({
      where: { organizationId: ORG, dayKey },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(fromRow);
  }
  async insert(job: JobRecord) {
    await db.leadResearchJob.create({
      data: {
        id: job.id,
        organizationId: ORG,
        idempotencyKey: job.idempotencyKey,
        dayKey: job.dayKey,
        status: job.status,
        revision: job.revision,
        leaseOwner: job.leaseOwner,
        leaseUntil: job.leaseUntil ? new Date(job.leaseUntil) : null,
        state: job as unknown as Prisma.InputJsonValue,
      },
    });
  }
  async save(job: JobRecord, expectedRevision: number) {
    const updated = await db.leadResearchJob.updateMany({
      where: { id: job.id, revision: expectedRevision },
      data: {
        status: job.status,
        revision: { increment: 1 },
        leaseOwner: job.leaseOwner,
        leaseUntil: job.leaseUntil ? new Date(job.leaseUntil) : null,
        state: { ...job, revision: expectedRevision + 1 } as unknown as Prisma.InputJsonValue,
      },
    });
    return updated.count === 1;
  }
}

export function storageMessage(error: unknown): string | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2021" || error.code === "P2022")) {
    return "Die Speicherung der Recherche ist noch nicht eingerichtet. Die Datenbankmigration wurde nicht ausgeführt. Es wurde nichts überschrieben.";
  }
  return null;
}
