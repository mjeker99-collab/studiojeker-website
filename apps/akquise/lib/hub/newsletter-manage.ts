import { z } from "zod";
import { db } from "../db";
import { PolicyError } from "../policy";
import { audit } from "../workflow";
import { hubActor } from "./workflow";

// Removing a draft from the list is reversible; permanent deletion is a
// deliberate second operation available only for unused, unpublished drafts.
export const newsletterManageInput = z.object({
  version: z.number().int().positive(),
  action: z.enum(["trash", "restore", "delete"]),
  confirmedTitle: z.string().max(200).optional(),
}).strict();

export async function manageNewsletter(actor: string, id: string, raw: unknown) {
  const input = newsletterManageInput.parse(raw);
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"hub:" + id}))`;
    const draft = await tx.marketingContent.findFirst({
      where: { id, organizationId: "studiojeker", kind: "NEWSLETTER" },
      include: {
        publications: { select: { id: true }, take: 1 },
        mailchimpTransfers: { select: { id: true }, take: 1 },
        approvals: { where: { status: "APPROVED" }, select: { id: true }, take: 1 },
      },
    });
    if (!draft) throw new PolicyError("Newsletter nicht gefunden.", 404);
    if (draft.version !== input.version)
      throw new PolicyError("Newsletter wurde inzwischen geändert. Bitte neu laden.", 409);

    if (input.action === "trash" || input.action === "restore") {
      if (input.action === "trash" && !draft.archivedAt) {
        await tx.marketingContent.update({ where: { id }, data: { archivedAt: new Date() } });
        await audit(tx, actor, "NEWSLETTER_TRASHED", id, { version: draft.version, title: draft.title });
      } else if (input.action === "restore" && draft.archivedAt) {
        await tx.marketingContent.update({ where: { id }, data: { archivedAt: null } });
        await audit(tx, actor, "NEWSLETTER_RESTORED", id, { version: draft.version, title: draft.title });
      }
      return { ok: true, action: input.action, id };
    }

    if (!draft.archivedAt)
      throw new PolicyError("Zuerst in den Papierkorb verschieben.", 409);
    if (input.confirmedTitle !== draft.title)
      throw new PolicyError("Titel zur endgültigen Löschung bestätigen.", 400);
    if (draft.publications.length || draft.mailchimpTransfers.length || draft.approvals.length ||
        !["DRAFT", "IN_REVIEW"].includes(draft.status)) {
      throw new PolicyError(
        "Dieser Newsletter wurde bereits freigegeben, übertragen oder veröffentlicht. Er bleibt im Papierkorb und kann nicht endgültig gelöscht werden.",
        409,
      );
    }

    // Delete only editorial snapshots of this newsletter. Never remove
    // GitHub template sources, campaigns, projects, Mailchimp items or media.
    await tx.marketingApproval.deleteMany({ where: { contentId: id } });
    await tx.newsletterExport.deleteMany({ where: { contentId: id } });
    await tx.marketingVersion.deleteMany({ where: { contentId: id } });
    await tx.marketingContent.delete({ where: { id } });
    await audit(tx, actor, "NEWSLETTER_DELETED", id, {
      version: draft.version, title: draft.title, preservedTemplate: true,
      preservedCampaign: true, preservedMedia: true,
    });
    return { ok: true, action: "delete", id };
  });
}
