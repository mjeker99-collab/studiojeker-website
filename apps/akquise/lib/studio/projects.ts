import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "../db";
import { hubActor, saveContentInTx } from "../hub/workflow";
import { contentInput } from "../hub/input";
import { PolicyError } from "../policy";
import { audit } from "../workflow";
import { ORG } from "./input";

const selection = z
  .object({
    title: z.string().trim().min(1).max(160),
    customerId: z.string().min(1).nullable(),
    campaignId: z.string().min(1).nullable(),
    expectedTitle: z.string(),
    expectedCustomerId: z.string().nullable(),
    expectedCampaignId: z.string().nullable(),
  })
  .strict();

// Keep the project, briefing and versioned content association consistent.
// A stale browser must never move a project that someone else has reassigned.
export async function assignProject(actor: string, id: string, raw: unknown) {
  const data = selection.parse(raw);
  try {
    return await db.$transaction(
      async (tx) => {
        await hubActor(tx, actor);
        const series = await tx.studioSeries.findFirst({
          where: { id, organizationId: ORG, concept: { is: null } },
          include: {
            contents: {
              include: { versions: { orderBy: { version: "desc" }, take: 1 } },
            },
          },
        });
        if (!series) throw new PolicyError("Projekt nicht zugänglich.", 404);
        const briefing = series.briefing as Record<string, Prisma.JsonValue>;
        if (
          series.title !== data.expectedTitle ||
          series.customerId !== data.expectedCustomerId ||
          (briefing.campaignId || null) !== data.expectedCampaignId
        )
          throw new PolicyError(
            "Projekt wurde geändert. Status aktualisieren und erneut zuordnen.",
            409,
          );
        if (
          data.customerId &&
          !(await tx.customer.findFirst({
            where: {
              id: data.customerId,
              organizationId: ORG,
              status: "ACTIVE",
            },
          }))
        )
          throw new PolicyError("Kunde nicht zugänglich.", 403);
        if (
          data.campaignId &&
          !(await tx.campaign.findFirst({
            where: {
              id: data.campaignId,
              organizationId: ORG,
              customerId: data.customerId,
            },
          }))
        )
          throw new PolicyError(
            "Kampagne gehört nicht zum gewählten Kunden.",
            403,
          );
        const changed = series.contents.filter(
          (c) => c.campaignId !== data.campaignId,
        );
        if (changed.some((c) => c.status !== "DRAFT"))
          throw new PolicyError(
            "Nur Entwürfe können neu zugeordnet werden. Bereits geprüfte Inhalte zuerst als neue Entwurfsversion öffnen.",
            409,
          );
        for (const content of changed) {
          const payload = contentInput.parse(content.versions[0]?.payload);
          await saveContentInTx(
            tx,
            actor,
            { ...payload, campaignId: data.campaignId },
            content.id,
            content.version,
          );
        }
        await tx.studioSeries.update({
          where: { id },
          data: {
            title: data.title,
            customerId: data.customerId,
            briefing: {
              ...briefing,
              title: data.title,
              customerId: data.customerId,
              campaignId: data.campaignId,
            } as Prisma.InputJsonValue,
          },
        });
        await audit(tx, actor, "STUDIO_PROJECT_ASSIGNED", id, {
          customerId: data.customerId,
          campaignId: data.campaignId,
          contentCount: changed.length,
        });
        return { id };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 30000,
      },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    )
      throw new PolicyError(
        "Projekt wurde gleichzeitig geändert. Status aktualisieren.",
        409,
      );
    throw error;
  }
}
