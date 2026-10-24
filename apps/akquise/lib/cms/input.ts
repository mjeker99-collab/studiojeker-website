import { z } from "zod";
import templates from "../../templates/newsletter-cms.json";
import { contentInput } from "../hub/input";
import { newsletterText } from "../hub/newsletter-template";

export const cmsTemplates = templates;
export const cmsImportInput = z
  .object({
    id: z
      .string()
      .regex(/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,127}$/)
      .refine((id) => !id.startsWith("drafts.") && !id.startsWith("versions.")),
    revision: z.string().min(1).max(200),
  })
  .strict();
export function newsletterFromSanity(raw: unknown, actor: string) {
  const doc = z
    .object({
      _id: cmsImportInput.shape.id,
      _rev: z.string().min(1),
      _type: z.string(),
      title: z.string(),
      subject: z.string(),
      preheader: z.string().optional(),
      audience: z.string(),
    })
    .passthrough()
    .parse(raw);
  const template = templates.find((t) => t.type === doc._type);
  if (!template) throw new Error("Unbekannte Sanity-Newsletter-Vorlage.");
  const newsletter = {
    templateId: template.id,
    fields: Object.fromEntries(
      template.fields.map((f) => [f.key, doc[f.name]]),
    ),
  };
  // Existing newsletter validation enforces exact slots, HTTPS URLs and size limits.
  const payload = contentInput.parse({
    kind: "NEWSLETTER",
    title: doc.title,
    subject: doc.subject,
    preheader: doc.preheader || "",
    audience: doc.audience,
    newsletter,
    body: "Sanity-Import",
    ownerId: actor,
    campaignId: null,
    scheduledAt: null,
    variants: [],
  });
  payload.body = newsletterText(payload.newsletter!).trim();
  return contentInput.parse(payload);
}
