import { z } from "zod";
import library from "../../templates/newsletter-library.json";

// Versions are immutable: when changing a source, add a new template ID.
export const newsletterLibrary = library;
export type NewsletterTemplate = (typeof library)[number];
export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]!,
  );
export function getNewsletterTemplate(id: string) {
  const template = library.find((t) => t.id === id);
  if (!template) throw new Error("Newsletter-Vorlage nicht gefunden.");
  return template;
}
export function newsletterDefaults(id: string) {
  const template = getNewsletterTemplate(id);
  return {
    templateId: id,
    fields: Object.fromEntries(
      template.slots.filter((s) => !s.special).map((s) => [s.key, s.value]),
    ),
  };
}
export const newsletterSnapshot = z
  .object({
    templateId: z.string().max(80),
    fields: z.record(z.string().max(100), z.string().max(8000)),
  })
  .strict()
  .superRefine((value, ctx) => {
    const template = library.find((t) => t.id === value.templateId);
    if (!template) {
      ctx.addIssue({
        code: "custom",
        message: "Unbekannte Newsletter-Vorlage.",
      });
      return;
    }
    const slots = template.slots.filter((s) => !s.special);
    if (
      Object.keys(value.fields).length !== slots.length ||
      slots.some((s) => typeof value.fields[s.key] !== "string")
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Vorlagenfelder fehlen oder wurden verändert.",
      });
      return;
    }
    for (const s of slots) {
      const field = value.fields[s.key];
      if (s.kind === "image" || s.kind === "link") {
        try {
          const u = new URL(field);
          if (
            u.protocol !== "https:" ||
            u.username ||
            u.password ||
            field.length > 2000
          )
            throw new Error();
        } catch {
          ctx.addIssue({
            code: "custom",
            path: ["fields", s.key],
            message:
              "Bild und Link benötigen eine HTTPS-URL ohne Zugangsdaten.",
          });
        }
      }
      if (s.kind === "alt" && field.length > 500)
        ctx.addIssue({
          code: "custom",
          path: ["fields", s.key],
          message: "Bildbeschreibung ist zu lang.",
        });
    }
    if (Object.values(value.fields).join("").length > 24000)
      ctx.addIssue({
        code: "custom",
        message: "Newsletter-Inhalte sind zu lang.",
      });
  });
export type NewsletterSnapshot = z.infer<typeof newsletterSnapshot>;
export function renderNewsletter(input: {
  subject: string;
  preheader: string;
  newsletter: NewsletterSnapshot;
}) {
  const snapshot = newsletterSnapshot.parse(input.newsletter);
  const template = getNewsletterTemplate(snapshot.templateId);
  let result = "",
    cursor = 0;
  for (const slot of template.slots) {
    const value =
      slot.special === "subject"
        ? input.subject
        : slot.special === "preheader"
          ? input.preheader
          : snapshot.fields[slot.key];
    result += template.html.slice(cursor, slot.start);
    // Unedited slots retain even the original entity spelling and whitespace.
    result +=
      value === slot.value
        ? template.html.slice(slot.start, slot.end)
        : slot.kind === "text" && !slot.special
          ? escapeHtml(value).replace(/\r?\n/g, "<br>")
          : escapeHtml(value);
    cursor = slot.end;
  }
  const rendered = result + template.html.slice(cursor);
  // The V4 video edition is already in use by newsletter drafts. Fix only
  // this edition's contact block at render time so no stored content, media,
  // original template or newsletter version is silently rewritten.
  return snapshot.templateId === "newsletter-04-video-promo-20261102"
    ? contactHeadingFirst(rendered)
    : rendered;
}

// In the source V4 video template, the contact paragraph mistakenly precedes
// its heading. Swap only these two complete HTML siblings. This also applies
// to Mailchimp HTML export, which uses the same renderer as StudioONE preview.
export function contactHeadingFirst(html: string): string {
  const bodyStart = html.indexOf('<div mc:edit="contact_body"');
  if (bodyStart < 0) return html;
  const headingOpen = '<div style="padding-top:14px;"><h2 class="sj-heading" mc:edit="contact_headline"';
  const headingStart = html.indexOf(headingOpen, bodyStart);
  if (headingStart < 0) return html;
  const bodyEnd = headingStart;
  const body = html.slice(bodyStart, bodyEnd);
  if (!body.endsWith("</div>")) return html;
  const headingEndTag = "</h2></div>";
  const headingEnd = html.indexOf(headingEndTag, headingStart);
  if (headingEnd < 0) return html;
  const afterHeading = headingEnd + headingEndTag.length;
  const heading = html.slice(headingStart, afterHeading)
    .replace('style="padding-top:14px;"', 'style="padding-top:0;"');
  return html.slice(0, bodyStart) + heading + body + html.slice(afterHeading);
}
export function newsletterText(snapshot: NewsletterSnapshot) {
  const template = getNewsletterTemplate(snapshot.templateId);
  return template.slots
    .filter((s) => !s.special && (s.kind === "text" || s.kind === "link"))
    .map((s) => snapshot.fields[s.key])
    .join("\n\n");
}
export function previewDocument(html: string) {
  // Opaque iframe origin; no scripts, forms, navigation permissions or referrer.
  return html
    .replace(/(<a\b[^>]*?)\bhref=/gi, "$1data-preview-href=")
    .replace(
      /<head[^>]*>/i,
      '$&<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; img-src https: data:; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;"><meta name="referrer" content="no-referrer">',
    );
}
