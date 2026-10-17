import { z } from "zod";
import { db } from "../db";
import { PolicyError } from "../policy";
import { audit } from "../workflow";
import { contentInput } from "./input";
import { hubActor, saveContentInTx } from "./workflow";
import {
  newsletterLibrary,
  newsletterDefaults,
  newsletterText,
} from "./newsletter-template";

// Imported sources are saved once, even if both users press import concurrently.
export async function importNewsletters(actor: string) {
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('newsletter-library-import-v1'))`;
    const ids: string[] = [];
    for (const template of newsletterLibrary) {
      const previous = await tx.audit.findFirst({
        where: { action: "NEWSLETTER_SOURCE_IMPORTED", entityId: template.id },
      });
      if (previous) continue;
      const newsletter = newsletterDefaults(template.id);
      const payload = contentInput.parse({
        kind: "NEWSLETTER",
        title: template.name,
        ownerId: actor,
        campaignId: null,
        scheduledAt: null,
        subject: template.subject,
        preheader: template.preheader,
        body: newsletterText(newsletter),
        audience: "Vor Versand in Mailchimp festlegen",
        variants: [],
        newsletter,
      });
      const c = await saveContentInTx(tx, actor, payload);
      await audit(tx, actor, "NEWSLETTER_SOURCE_IMPORTED", template.id, {
        contentId: c.id,
        source: template.source,
        sha256: template.sha256,
      });
      ids.push(c.id);
    }
    return { imported: ids.length, ids };
  });
}
export async function duplicateNewsletter(
  actor: string,
  id: string,
  version: number,
) {
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"hub:" + id}))`;
    const source = await tx.marketingContent.findUniqueOrThrow({
      where: { id },
      include: { versions: { where: { version } } },
    });
    if (
      source.kind !== "NEWSLETTER" ||
      source.version !== version ||
      !source.versions[0]
    )
      throw new PolicyError("Newsletter wurde geändert. Neu laden.", 409);
    const payload = contentInput.parse(source.versions[0].payload);
    const copy = await saveContentInTx(tx, actor, {
      ...payload,
      title: (payload.title + " · Kopie").slice(0, 200),
      ownerId: actor,
      scheduledAt: null,
    });
    await audit(tx, actor, "NEWSLETTER_DUPLICATED", copy.id, {
      sourceId: id,
      sourceVersion: version,
    });
    return copy;
  });
}
export const duplicateInput = z
  .object({ version: z.number().int().positive() })
  .strict();
