import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "../db";
import { brandDefaults } from "../library/input";
import { PolicyError } from "../policy";
import { audit } from "../workflow";
import { contentInput } from "../hub/input";
import { hubActor, saveContentInTx } from "../hub/workflow";
import { workspaceForBriefing } from "../hub/workspace";
import { briefingSchema, ORG, type StudioSnapshot } from "./input";
import { logoHash } from "./config";

const json = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

const batchSchema = z
  .object({
    requestKey: z.string().uuid(),
    items: z.array(z.unknown()).min(2).max(8),
  })
  .strict();

/**
 * Create a group of Content-Studio series in one PostgreSQL transaction.
 * The request key is recorded in the audit log under an advisory lock so a
 * retry after a lost response returns the original series instead of making
 * duplicates. This endpoint creates private drafts only; it never calls GPT
 * or publishes content.
 */
export async function createSeriesBatch(actor: string, raw: unknown) {
  const input = batchSchema.parse(raw);
  const briefs = input.items.map((item) => briefingSchema.parse(item));
  const totalPosts = briefs.reduce((sum, brief) => sum + brief.count, 0);
  if (totalPosts > 48)
    throw new PolicyError("Der Auftrag umfasst zu viele Beiträge auf einmal.", 400);

  const batchEntityId = `studio-series-batch:${input.requestKey}`;
  return db.$transaction(
    async (tx) => {
      await hubActor(tx, actor);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"studio-batch:" + actor + ":" + input.requestKey}))`;

      const previous = await tx.audit.findFirst({
        where: {
          userId: actor,
          action: "STUDIO_SERIES_BATCH_CREATED",
          entityId: batchEntityId,
        },
      });
      if (previous) {
        const detail = previous.detail as { seriesIds?: unknown };
        if (
          !Array.isArray(detail.seriesIds) ||
          !detail.seriesIds.every((id) => typeof id === "string")
        )
          throw new PolicyError("Gespeicherter Auftragsschlüssel ist unvollständig.", 409);
        const ids = detail.seriesIds as string[];
        const found = await tx.studioSeries.findMany({
          where: { id: { in: ids }, organizationId: ORG },
        });
        const byId = new Map(found.map((series) => [series.id, series]));
        if (ids.some((id) => !byId.has(id)))
          throw new PolicyError("Gespeicherte Entwürfe konnten nicht vollständig wiedergefunden werden.", 409);
        return { series: ids.map((id) => byId.get(id)!), replayed: true };
      }

      const brandRecord = await tx.studioOrganization.findUniqueOrThrow({
        where: { id: ORG },
      });
      const brandProfile = brandDefaults(brandRecord.brand);
      const brandLogo = brandProfile.logoAssetId
        ? await tx.studioAsset.findFirst({
            where: {
              id: brandProfile.logoAssetId,
              organizationId: ORG,
              deletedAt: null,
            },
          })
        : null;
      const brandFont = brandProfile.fontAssetId
        ? await tx.studioAsset.findFirst({
            where: {
              id: brandProfile.fontAssetId,
              organizationId: ORG,
              deletedAt: null,
              kind: "FONT",
            },
          })
        : null;

      const created = [];
      for (const brief of briefs) {
        if (
          brief.campaignId &&
          !(await tx.campaign.findFirst({
            where: {
              id: brief.campaignId,
              organizationId: ORG,
              customerId: brief.customerId,
            },
          }))
        )
          throw new PolicyError("Kampagne gehört nicht zum gewählten Kunden.", 403);
        if (
          brief.customerId &&
          !(await tx.customer.findFirst({
            where: {
              id: brief.customerId,
              organizationId: ORG,
              status: "ACTIVE",
            },
          }))
        )
          throw new PolicyError("Kunde nicht zugänglich.", 403);
        if (
          (await tx.studioAsset.count({
            where: {
              id: { in: brief.referenceAssetIds },
              organizationId: ORG,
              deletedAt: null,
              mime: { startsWith: "image/" },
              libraryItem: { is: { archivedAt: null } },
            },
          })) !== new Set(brief.referenceAssetIds).size
        )
          throw new PolicyError("Referenz nicht zugänglich.", 403);
        if (
          (brief.libraryReferenceIds?.length || 0) !==
          (await tx.libraryItem.count({
            where: {
              id: { in: brief.libraryReferenceIds || [] },
              organizationId: ORG,
              archivedAt: null,
            },
          }))
        )
          throw new PolicyError("Bibliotheksreferenz nicht zugänglich.", 403);

        const workspace = workspaceForBriefing(brief);
        const storedBrief = { ...brief };
        delete storedBrief.workspace;
        const series = await tx.studioSeries.create({
          data: {
            title: brief.title,
            customerId: brief.customerId,
            briefing: json(storedBrief),
            ownerId: actor,
            organizationId: ORG,
          },
        });
        for (let index = 0; index < brief.count; index++) {
          const studio: StudioSnapshot = {
            organizationId: ORG,
            seriesId: series.id,
            brandVersion: "studio-v1",
            brandProfile,
            brandRevision: brandRecord.brandRevision,
            ...(brandLogo ? { brandLogoSha256: brandLogo.sha256 } : {}),
            imageIdea: "",
            headline: "",
            hashtags: "",
            motifAssetId: null,
            motifSha256: "",
            fontAssetId: brandFont?.id || null,
            fontSha256: brandFont?.sha256 || "",
            logoSha256: logoHash(),
            template: "PANEL",
            formats: brief.formats,
            cropX: 0.5,
            cropY: 0.5,
            zoom: 1,
            showLogo: true,
            showClaim: false,
            showHeadline: false,
            source: "OWN",
          };
          await saveContentInTx(
            tx,
            actor,
            contentInput.parse({
              kind: "SOCIAL",
              title: `${brief.title} · ${index + 1}`,
              ownerId: actor,
              campaignId: brief.campaignId,
              scheduledAt: null,
              subject: "",
              preheader: "",
              body: "",
              audience: brief.audience,
              studio,
              variants: brief.channels.map((channel) => ({
                channel,
                text: brief.topic,
                link: "",
                cta: "",
                mediaType: "NONE",
                mediaUrl: "",
                mediaReference: "",
                scheduledAt: null,
              })),
            }),
            undefined,
            undefined,
            { workspace },
          );
        }
        await audit(tx, actor, "STUDIO_SERIES_CREATED", series.id, {
          count: brief.count,
        });
        created.push(series);
      }

      await audit(tx, actor, "STUDIO_SERIES_BATCH_CREATED", batchEntityId, {
        seriesIds: created.map((series) => series.id),
        totalPosts,
      });
      return { series: created, replayed: false };
    },
    { timeout: 30000 },
  );
}
