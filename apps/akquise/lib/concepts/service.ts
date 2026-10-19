import { z } from "zod";
import { db } from "../db";
import { hubActor } from "../hub/workflow";
import { audit, type Tx } from "../workflow";
import { PolicyError } from "../policy";
import { ORG } from "../studio/input";
import { publicConfig } from "../studio/config";
import {
  conceptInput,
  conceptText,
  chapters,
  type ConceptInput,
} from "./input";
const versionInput = z
  .object({ version: z.number().int().positive() })
  .strict();
async function associations(tx: Tx, data: ConceptInput) {
  if (
    data.customerId &&
    !(await tx.customer.findFirst({
      where: { id: data.customerId, organizationId: ORG, status: "ACTIVE" },
    }))
  )
    throw new PolicyError("Kunde nicht zugänglich oder inaktiv.", 403);
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
    throw new PolicyError("Kampagne gehört nicht zum gewählten Kunden.", 403);
}
async function current(tx: Tx, actor: string, id: string, version: number) {
  await hubActor(tx, actor);
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"concept:" + id}))`;
  const concept = await tx.strategyConcept.findFirst({
    where: { id, organizationId: ORG },
    include: { versions: { where: { version } } },
  });
  if (!concept) throw new PolicyError("Konzept nicht zugänglich.", 404);
  if (concept.version !== version)
    throw new PolicyError(
      "Konzept wurde geändert. Neu laden; eigene Änderungen vorher kopieren.",
      409,
    );
  return { concept, snapshot: concept.versions[0] };
}
export async function conceptState(actor: string, id?: string) {
  await db.$transaction((tx) => hubActor(tx, actor));
  if (id) {
    const concept = await db.strategyConcept.findFirst({
      where: { id, organizationId: ORG },
      include: {
        versions: { orderBy: { version: "desc" } },
        series: {
          include: {
            jobs: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                status: true,
                input: true,
                result: true,
                error: true,
              },
            },
          },
        },
      },
    });
    if (!concept) throw new PolicyError("Konzept nicht zugänglich.", 404);
    return concept;
  }
  const [concepts, customers, campaigns, users] = await Promise.all([
    db.strategyConcept.findMany({
      where: { organizationId: ORG },
      orderBy: { updatedAt: "desc" },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    }),
    db.customer.findMany({
      where: { organizationId: ORG },
      select: { id: true, name: true, status: true },
      orderBy: { name: "asc" },
    }),
    db.campaign.findMany({
      where: { organizationId: ORG },
      select: { id: true, title: true, customerId: true },
    }),
    db.user.findMany({ select: { id: true, name: true } }),
  ]);
  return { concepts, customers, campaigns, users, config: publicConfig() };
}
export async function saveConcept(actor: string, raw: unknown, id?: string) {
  const envelope = id
    ? z
        .object({ version: z.number().int().positive(), data: conceptInput })
        .strict()
        .parse(raw)
    : null;
  const data = envelope?.data ?? conceptInput.parse(raw);
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await associations(tx, data);
    const old = id ? await current(tx, actor, id, envelope!.version) : null;
    if (
      old &&
      conceptInput.parse(old.snapshot.payload).customerId !== data.customerId
    )
      throw new PolicyError(
        "Kunde eines gespeicherten Konzepts bleibt fest zugeordnet. Neues Konzept anlegen.",
        409,
      );
    const version = (old?.concept.version ?? 0) + 1;
    // A conversation series without fabricated social posts or channel selection.
    const seriesData = {
      title: data.title,
      customerId: data.customerId,
      briefing: {
        title: data.title,
        topic: "Strategie & Konzepte",
        offer: "",
        goal: "Im Gespräch klären",
        audience: "Im Gespräch klären",
        tone: "Schweizer Hochdeutsch",
        channels: ["LINKEDIN"],
        count: 1,
        formats: ["4:5"],
        campaignId: data.campaignId,
        customerId: data.customerId,
        referenceAssetIds: [],
        brandRules: [],
      },
    };
    const series = old
      ? await tx.studioSeries.update({
          where: { id: old.concept.seriesId },
          data: seriesData,
        })
      : await tx.studioSeries.create({
          data: { ...seriesData, organizationId: ORG, ownerId: actor },
        });
    const concept = old
      ? await tx.strategyConcept.update({ where: { id }, data: { version } })
      : await tx.strategyConcept.create({
          data: { organizationId: ORG, seriesId: series.id },
        });
    await tx.strategyVersion.create({
      data: { conceptId: concept.id, version, payload: data, createdBy: actor },
    });
    await audit(tx, actor, "CONCEPT_SAVED", concept.id, { version });
    return { id: concept.id, version };
  });
}
export async function approveConcept(actor: string, id: string, raw: unknown) {
  const { version, confirmed } = versionInput
    .extend({ confirmed: z.literal(true) })
    .parse(raw);
  return db.$transaction(async (tx) => {
    const { snapshot } = await current(tx, actor, id, version);
    const data = conceptInput.parse(snapshot.payload);
    if (!confirmed || chapters.some(([key]) => !data[key]))
      throw new PolicyError(
        "Alle Kapitel ausfüllen; offene Punkte ausdrücklich benennen.",
      );
    if (snapshot.approvedAt) return { ok: true };
    await tx.strategyVersion.update({
      where: { id: snapshot.id },
      data: { approvedBy: actor, approvedAt: new Date() },
    });
    await audit(tx, actor, "CONCEPT_APPROVED", id, { version });
    return { ok: true };
  });
}
export async function handoffConcept(actor: string, id: string, raw: unknown) {
  const data = versionInput
    .extend({ startsAt: z.string().datetime(), endsAt: z.string().datetime() })
    .refine((v) => v.endsAt >= v.startsAt, "Ende liegt vor Beginn.")
    .parse(raw);
  return db.$transaction(async (tx) => {
    const { snapshot } = await current(tx, actor, id, data.version);
    if (!snapshot.approvedAt)
      throw new PolicyError("Diese Konzeptversion zuerst freigeben.", 409);
    if (snapshot.handoffCampaignId)
      return { campaignId: snapshot.handoffCampaignId };
    const payload = conceptInput.parse(snapshot.payload);
    await associations(tx, payload);
    const campaign = await tx.campaign.create({
      data: {
        organizationId: ORG,
        customerId: payload.customerId,
        title: payload.title,
        goal: payload.goals.slice(0, 2000),
        audience: payload.audience.slice(0, 2000),
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        ownerId: actor,
      },
    });
    await tx.strategyVersion.update({
      where: { id: snapshot.id },
      data: { handoffCampaignId: campaign.id },
    });
    await audit(tx, actor, "CONCEPT_HANDED_OFF", id, {
      version: data.version,
      campaignId: campaign.id,
    });
    return { campaignId: campaign.id };
  });
}
// Campaign context always uses the exact approved version handed off, even after later edits.
export async function campaignConcept(tx: Tx, campaignId: string | null) {
  if (!campaignId) return null;
  const version = await tx.strategyVersion.findFirst({
    where: {
      handoffCampaignId: campaignId,
      approvedAt: { not: null },
      concept: { organizationId: ORG },
    },
  });
  if (!version) return null;
  const campaign = await tx.campaign.findFirst({
    where: { id: campaignId, organizationId: ORG },
  });
  const payload = conceptInput.parse(version.payload);
  if (!campaign || campaign.customerId !== payload.customerId) return null;
  return {
    conceptId: version.conceptId,
    version: version.version,
    briefing: conceptText(payload),
  };
}
export async function conceptMutation(
  actor: string,
  path: string[],
  body: unknown,
) {
  if (path.length === 1) return saveConcept(actor, body);
  if (path.length === 2) return saveConcept(actor, body, path[1]);
  if (path.length === 3 && path[2] === "approve")
    return approveConcept(actor, path[1], body);
  if (path.length === 3 && path[2] === "handoff")
    return handoffConcept(actor, path[1], body);
  throw new PolicyError("Konzept-Funktion nicht gefunden.", 404);
}
