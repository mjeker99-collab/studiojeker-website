import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "../db";
import { hubActor } from "../hub/workflow";
import { brandDefaults } from "../library/input";
import { customerKnowledgeContext } from "../customer-knowledge";
import { PolicyError } from "../policy";
import { audit } from "../workflow";
import { ORG } from "./input";

export const preferencesInput = z
  .object({
    revision: z.number().int().positive(),
    text: z.string().trim().max(2000),
  })
  .strict();

export async function saveAssistantPreferences(actor: string, raw: unknown) {
  const input = preferencesInput.parse(raw);
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    const updated = await tx.user.updateMany({
      where: { id: actor, studioContextRevision: input.revision },
      data: {
        studioContext: input.text,
        studioContextRevision: { increment: 1 },
      },
    });
    if (!updated.count)
      throw new PolicyError(
        "Deine Vorgaben wurden geändert. Bitte neu laden.",
        409,
      );
    await audit(tx, actor, "STUDIO_PREFERENCES_UPDATED", actor, {
      revision: input.revision + 1,
    });
    return { text: input.text, revision: input.revision + 1 };
  });
}

// Context is captured with the job. Only projects of the same organisation AND
// customer are eligible; an agency customer's knowledge never crosses clients.
export async function assistantContext(
  tx: Prisma.TransactionClient,
  actor: string,
  seriesId: string,
  customerId: string | null,
  useProjectMemory: boolean,
) {
  const [organization, user, customer, projects] = await Promise.all([
    tx.studioOrganization.findUniqueOrThrow({ where: { id: ORG } }),
    tx.user.findUniqueOrThrow({
      where: { id: actor },
      select: { name: true, studioContext: true, studioContextRevision: true },
    }),
    customerId
      ? tx.customer.findFirst({
          where: { id: customerId, organizationId: ORG, status: "ACTIVE" },
        })
      : null,
    useProjectMemory
      ? tx.studioSeries.findMany({
          where: {
            organizationId: ORG,
            customerId,
            id: { not: seriesId },
            concept: { is: null },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            title: true,
            briefing: true,
            createdAt: true,
            jobs: {
              where: { kind: "CHAT", status: "SUCCEEDED" },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { input: true, result: true, completedAt: true },
            },
          },
        })
      : [],
  ]);
  if (customerId && !customer)
    throw new PolicyError("Kunde nicht zugänglich oder inaktiv.", 403);
  return {
    organization: {
      name: organization.name,
      revision: organization.brandRevision,
      profile: brandDefaults(organization.brand),
    },
    user: {
      name: user.name,
      preferences: user.studioContext,
      revision: user.studioContextRevision,
    },
    customer: customer ? customerKnowledgeContext(customer) : null,
    projectMemory: projects.map((project) => {
      const brief = project.briefing as { topic?: string; goal?: string };
      const last = project.jobs[0];
      const request = last?.input as
        { request?: { message?: string } } | undefined;
      const result = last?.result as { reply?: string } | undefined;
      return {
        id: project.id,
        title: project.title,
        createdAt: project.createdAt,
        topic: (brief.topic || "").slice(0, 600),
        goal: (brief.goal || "").slice(0, 300),
        lastRequest: (request?.request?.message || "").slice(0, 500),
        lastProposal: (result?.reply || "").slice(0, 1600),
        asOf: last?.completedAt || project.createdAt,
      };
    }),
  };
}
