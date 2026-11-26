import { db } from "../db";
import { PolicyError } from "../policy";
import { audit } from "../workflow";
import { approvedContent, hubActor } from "./workflow";
import { newsletterHtml, newsletterText } from "./newsletter-template";
export { newsletterHtml } from "./newsletter-template";
export async function exportNewsletter(
  actor: string,
  id: string,
  version: number,
) {
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"hub:" + id}))`;
    const { c, payload } = await approvedContent(tx, id, version);
    if (c.kind !== "NEWSLETTER")
      throw new PolicyError("Nur Newsletter können exportiert werden.");
    const result = await tx.newsletterExport.create({
      data: { contentId: id, version, userId: actor },
    });
    await audit(tx, actor, "NEWSLETTER_EXPORTED_NOT_TRANSFERRED", id, {
      version,
      exportId: result.id,
    });
    return {
      html: newsletterHtml(payload),
      text: payload.newsletter
        ? newsletterText(payload.newsletter)
        : payload.body,
      subject: payload.subject,
      preheader: payload.preheader,
      version,
      exportedAt: result.createdAt,
      transferred: false,
      sent: false,
    };
  });
}
