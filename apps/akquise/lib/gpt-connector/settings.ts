import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import { PolicyError } from "../policy";
import { allowedAccount } from "../config.mjs";
import { audit, type Tx } from "../workflow";
import {
  connectorTokenConfigured,
  parseScopes,
} from "./auth";
import {
  GPT_ENTITY_TYPES,
  defaultScopes,
  type GptConnectorStatus,
  type GptEntityType,
  type GptScopes,
} from "./types";

async function ensureActor(tx: Tx, userId: string) {
  const user = await tx.user.findFirst({ where: { id: userId, active: true } });
  if (!user || !allowedAccount(user))
    throw new PolicyError("Keine Berechtigung.", 403);
  return user;
}

async function ensureSettings(tx: Tx) {
  return tx.gptIntegration.upsert({
    where: { id: "studiojeker" },
    create: {
      id: "studiojeker",
      scopes: defaultScopes() as unknown as Prisma.InputJsonValue,
    },
    update: {},
  });
}

async function titleFor(
  entityType: GptEntityType,
  entityId: string,
): Promise<string> {
  switch (entityType) {
    case "CAMPAIGN": {
      const row = await db.campaign.findUnique({
        where: { id: entityId },
        select: { title: true },
      });
      return row?.title ?? entityId;
    }
    case "SERIES": {
      const row = await db.studioSeries.findUnique({
        where: { id: entityId },
        select: { title: true },
      });
      return row?.title ?? entityId;
    }
    case "CONTENT": {
      const row = await db.marketingContent.findUnique({
        where: { id: entityId },
        select: { title: true },
      });
      return row?.title ?? entityId;
    }
    case "CONCEPT": {
      const row = await db.strategyConcept.findUnique({
        where: { id: entityId },
        include: {
          versions: { orderBy: { version: "desc" }, take: 1 },
          series: { select: { title: true } },
        },
      });
      if (!row) return entityId;
      const parsed = row.versions[0]
        ? (row.versions[0].payload as { title?: string })
        : null;
      return parsed?.title || row.series.title;
    }
    case "LIBRARY": {
      const row = await db.libraryItem.findUnique({
        where: { id: entityId },
        select: { title: true },
      });
      return row?.title ?? entityId;
    }
  }
}

export async function gptConnectorStatus(
  userId: string,
): Promise<GptConnectorStatus> {
  await ensureActor(db, userId);
  const settings = await ensureSettings(db);
  const scopes = parseScopes(settings.scopes);
  const shares = await db.gptShare.findMany({
    orderBy: { sharedAt: "desc" },
    take: 200,
  });
  const [campaigns, projects, concepts, contents] = await Promise.all([
    db.campaign.findMany({
      where: { organizationId: "studiojeker" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true },
      take: 200,
    }),
    db.studioSeries.findMany({
      where: { organizationId: "studiojeker" },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true },
      take: 200,
    }),
    db.strategyConcept.findMany({
      where: { organizationId: "studiojeker" },
      orderBy: { updatedAt: "desc" },
      include: {
        series: { select: { title: true } },
        versions: { orderBy: { version: "desc" }, take: 1 },
      },
      take: 200,
    }),
    db.marketingContent.findMany({
      where: { organizationId: "studiojeker" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true },
      take: 200,
    }),
  ]);
  const sharedSet = new Set(shares.map((s) => `${s.entityType}:${s.entityId}`));
  const shareRows = await Promise.all(
    shares.map(async (s) => ({
      entityType: s.entityType as GptEntityType,
      entityId: s.entityId,
      title: await titleFor(s.entityType as GptEntityType, s.entityId),
      sharedAt: s.sharedAt.toISOString(),
    })),
  );
  const tokenConfigured = connectorTokenConfigured();
  const revoked = Boolean(settings.revokedAt);
  return {
    tokenConfigured,
    revoked,
    connected: tokenConfigured && !revoked,
    scopes,
    lastAccessAt: settings.lastAccessAt?.toISOString() ?? null,
    shares: shareRows,
    shareCandidates: {
      campaigns: campaigns.map((c) => ({
        id: c.id,
        title: c.title,
        shared: sharedSet.has(`CAMPAIGN:${c.id}`),
      })),
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        shared: sharedSet.has(`SERIES:${p.id}`),
      })),
      concepts: concepts.map((c) => {
        const payload = c.versions[0]?.payload as { title?: string } | undefined;
        return {
          id: c.id,
          title: payload?.title || c.series.title,
          shared: sharedSet.has(`CONCEPT:${c.id}`),
        };
      }),
      contents: contents.map((c) => ({
        id: c.id,
        title: c.title,
        shared: sharedSet.has(`CONTENT:${c.id}`),
      })),
    },
  };
}

const scopesSchema = z
  .object({
    projects: z.boolean(),
    campaigns: z.boolean(),
    concepts: z.boolean(),
    content: z.boolean(),
  })
  .strict();

export async function updateGptScopes(userId: string, body: unknown) {
  const scopes = scopesSchema.parse(body) as GptScopes;
  return db.$transaction(async (tx) => {
    await ensureActor(tx, userId);
    await ensureSettings(tx);
    const row = await tx.gptIntegration.update({
      where: { id: "studiojeker" },
      data: {
        scopes: scopes as unknown as Prisma.InputJsonValue,
        updatedBy: userId,
      },
    });
    await audit(tx, userId, "GPT_CONNECTOR_SCOPES_UPDATED", "studiojeker", {
      scopes,
    });
    return { scopes: parseScopes(row.scopes) };
  });
}

export async function revokeGptAccess(userId: string) {
  return db.$transaction(async (tx) => {
    await ensureActor(tx, userId);
    await ensureSettings(tx);
    await tx.gptIntegration.update({
      where: { id: "studiojeker" },
      data: { revokedAt: new Date(), updatedBy: userId },
    });
    await audit(tx, userId, "GPT_CONNECTOR_REVOKED", "studiojeker", {});
    return { revoked: true };
  });
}

export async function restoreGptAccess(userId: string) {
  return db.$transaction(async (tx) => {
    await ensureActor(tx, userId);
    await ensureSettings(tx);
    if (!connectorTokenConfigured())
      throw new PolicyError(
        "Connector-Token fehlt in den Server-Umgebungsvariablen.",
        503,
      );
    await tx.gptIntegration.update({
      where: { id: "studiojeker" },
      data: { revokedAt: null, updatedBy: userId },
    });
    await audit(tx, userId, "GPT_CONNECTOR_RESTORED", "studiojeker", {});
    return { revoked: false };
  });
}

const shareSchema = z
  .object({
    entityType: z.enum(GPT_ENTITY_TYPES),
    entityId: z.string().min(1).max(64),
    shared: z.boolean(),
  })
  .strict();

async function assertEntityExists(
  tx: Tx,
  entityType: GptEntityType,
  entityId: string,
) {
  switch (entityType) {
    case "CAMPAIGN":
      if (
        !(await tx.campaign.findFirst({
          where: { id: entityId, organizationId: "studiojeker" },
          select: { id: true },
        }))
      )
        throw new PolicyError("Kampagne nicht gefunden.", 404);
      break;
    case "SERIES":
      if (
        !(await tx.studioSeries.findFirst({
          where: { id: entityId, organizationId: "studiojeker" },
          select: { id: true },
        }))
      )
        throw new PolicyError("Projekt nicht gefunden.", 404);
      break;
    case "CONTENT":
      if (
        !(await tx.marketingContent.findFirst({
          where: { id: entityId, organizationId: "studiojeker" },
          select: { id: true },
        }))
      )
        throw new PolicyError("Inhalt nicht gefunden.", 404);
      break;
    case "CONCEPT":
      if (
        !(await tx.strategyConcept.findFirst({
          where: { id: entityId, organizationId: "studiojeker" },
          select: { id: true },
        }))
      )
        throw new PolicyError("Konzept nicht gefunden.", 404);
      break;
    case "LIBRARY":
      if (
        !(await tx.libraryItem.findFirst({
          where: { id: entityId, organizationId: "studiojeker" },
          select: { id: true },
        }))
      )
        throw new PolicyError("Bibliothekseintrag nicht gefunden.", 404);
      break;
  }
}

export async function setGptShare(userId: string, body: unknown) {
  const input = shareSchema.parse(body);
  return db.$transaction(async (tx) => {
    await ensureActor(tx, userId);
    await assertEntityExists(tx, input.entityType, input.entityId);
    if (input.shared) {
      await tx.gptShare.upsert({
        where: {
          entityType_entityId: {
            entityType: input.entityType,
            entityId: input.entityId,
          },
        },
        create: {
          entityType: input.entityType,
          entityId: input.entityId,
          sharedBy: userId,
        },
        update: { sharedBy: userId, sharedAt: new Date() },
      });
      await audit(tx, userId, "GPT_SHARE_GRANTED", input.entityId, {
        entityType: input.entityType,
      });
    } else {
      await tx.gptShare.deleteMany({
        where: { entityType: input.entityType, entityId: input.entityId },
      });
      await audit(tx, userId, "GPT_SHARE_REVOKED", input.entityId, {
        entityType: input.entityType,
      });
    }
    return { ok: true, ...input };
  });
}
