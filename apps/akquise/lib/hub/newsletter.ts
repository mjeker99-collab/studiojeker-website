import template from "../../templates/newsletter.json";
import { db } from "../db";
import { PolicyError } from "../policy";
import { audit } from "../workflow";
import { approvedContent, hubActor } from "./workflow";
export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function newsletterHtml(input: {
  subject: string;
  preheader: string;
  body: string;
}) {
  return template.html.replace(
    /\{\{(subject|preheader|body)\}\}/g,
    (_, key: "subject" | "preheader" | "body") =>
      key === "body"
        ? escapeHtml(input.body).replace(/\n/g, "<br>\n")
        : escapeHtml(input[key]),
  );
}
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
      text: payload.body,
      subject: payload.subject,
      preheader: payload.preheader,
      version,
      exportedAt: result.createdAt,
      transferred: false,
      sent: false,
    };
  });
}
