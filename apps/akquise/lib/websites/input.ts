import { z } from "zod";
const text = z.string().trim().max(3000);
export const imageUrl = z
  .string()
  .max(2000)
  .refine((v) => {
    if (!v) return true;
    try {
      const u = new URL(v);
      return u.protocol === "https:" && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Bild benötigt eine öffentliche HTTPS-Adresse.");
export const linkUrl = z
  .string()
  .max(2000)
  .refine((v) => {
    if (
      !v ||
      /^#[a-z][a-z0-9-]*$/.test(v) ||
      /^(index|[a-z][a-z0-9-]*)\.html$/.test(v)
    )
      return true;
    try {
      const u = new URL(v);
      return (
        ["https:", "http:", "mailto:", "tel:"].includes(u.protocol) &&
        !u.username &&
        !u.password
      );
    } catch {
      return false;
    }
  }, "Link muss eine Web-, E-Mail-, Telefon- oder Seitenadresse sein.");
export const sectionSchema = z
  .object({
    heading: z.string().trim().max(200),
    body: text,
    layout: z.enum(["TEXT", "SPLIT", "BANNER"]),
    imageUrl,
    imageAssetId: z.string().max(100).nullable().default(null),
    imageAlt: z.string().trim().max(300),
    ctaLabel: z.string().trim().max(100),
    ctaUrl: linkUrl,
  })
  .strict();
export const pageSchema = z
  .object({
    slug: z.string().regex(/^(index|[a-z][a-z0-9-]{0,60})$/),
    title: z.string().trim().min(1).max(100),
    seoTitle: z.string().trim().max(160),
    seoDescription: z.string().trim().max(320),
    headline: z.string().trim().max(200),
    intro: text,
    sections: z.array(sectionSchema).max(10),
  })
  .strict();
export const websiteDocument = z
  .object({
    name: z.string().trim().min(1).max(160),
    briefing: z.string().trim().max(6000),
    language: z.enum(["de-CH", "de", "en", "fr", "it"]),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    style: z.enum(["LIGHT", "DARK"]),
    template: z
      .enum(["EDITORIAL", "CAMPAIGN", "PORTFOLIO"])
      .default("EDITORIAL"),
    footer: text,
    pages: z.array(pageSchema).min(1).max(10),
  })
  .strict();
export const validatedDocument = websiteDocument.superRefine((v, ctx) => {
  if (!v.pages.some((p) => p.slug === "index"))
    ctx.addIssue({
      code: "custom",
      message: "Eine Startseite mit Adresse index ist erforderlich.",
      path: ["pages"],
    });
  if (new Set(v.pages.map((p) => p.slug)).size !== v.pages.length)
    ctx.addIssue({
      code: "custom",
      message: "Seitenadressen müssen eindeutig sein.",
      path: ["pages"],
    });
  for (const [i, p] of v.pages.entries())
    for (const [j, s] of p.sections.entries()) {
      if ((s.imageUrl || s.imageAssetId) && !s.imageAlt)
        ctx.addIssue({
          code: "custom",
          message: "Bildbeschreibung fehlt.",
          path: ["pages", i, "sections", j, "imageAlt"],
        });
      if (!!s.ctaLabel !== !!s.ctaUrl)
        ctx.addIssue({
          code: "custom",
          message: "Button benötigt Text und Ziel.",
          path: ["pages", i, "sections", j, "ctaUrl"],
        });
      if (
        /^[a-z][a-z0-9-]*\.html$/.test(s.ctaUrl) &&
        !v.pages.some((p) => p.slug + ".html" === s.ctaUrl)
      )
        ctx.addIssue({
          code: "custom",
          message: "Verlinkte Seite fehlt.",
          path: ["pages", i, "sections", j, "ctaUrl"],
        });
    }
});
export type WebsiteDocument = z.infer<typeof websiteDocument>;
export type WebsitePage = z.infer<typeof pageSchema>;
export const blankSection: z.infer<typeof sectionSchema> = {
  heading: "Neuer Abschnitt",
  body: "",
  layout: "TEXT",
  imageUrl: "",
  imageAssetId: null,
  imageAlt: "",
  ctaLabel: "",
  ctaUrl: "",
};
export const blankPage: WebsitePage = {
  slug: "index",
  title: "Startseite",
  seoTitle: "",
  seoDescription: "",
  headline: "Deine Überschrift",
  intro: "",
  sections: [],
};
export const blankWebsite: WebsiteDocument = {
  name: "Neue Website",
  briefing: "",
  language: "de-CH",
  accent: "#00cbdc",
  style: "LIGHT",
  template: "EDITORIAL",
  footer: "",
  pages: [blankPage],
};
export const suggestionSchema = z
  .object({
    reply: z.string().min(1).max(6000),
    document: websiteDocument.nullable(),
  })
  .strict();
export const assistantInput = z
  .object({
    version: z.number().int().positive(),
    message: z.string().trim().min(1).max(6000),
    requestKey: z.string().uuid(),
    confirmedCosts: z.literal(true),
    confirmedTransfer: z.literal(true),
  })
  .strict();
export type WebsiteSuggestion = z.infer<typeof suggestionSchema>;
