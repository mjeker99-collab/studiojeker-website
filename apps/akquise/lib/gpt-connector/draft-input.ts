import { z } from "zod";
import { channels, safeUrl, instant } from "../hub/input";
import { newsletterSnapshot } from "../hub/newsletter-template";

const text = (max: number) => z.string().trim().max(max);

const socialVariant = z
  .object({
    channel: z.enum(channels),
    text: text(12000).min(1),
    link: safeUrl.default(""),
    cta: text(300).default(""),
    mediaType: z.enum(["NONE", "IMAGE", "VIDEO"]).default("NONE"),
    mediaUrl: safeUrl.default(""),
    mediaReference: text(1000).default(""),
    scheduledAt: instant.default(null),
  })
  .strict();

const websitePagePatch = z
  .object({
    slug: z
      .string()
      .regex(/^(index|[a-z][a-z0-9-]{0,60})$/)
      .default("index"),
    title: text(100).min(1),
    seoTitle: text(160).default(""),
    seoDescription: text(320).default(""),
    headline: text(200).default(""),
    intro: text(3000).default(""),
    sections: z
      .array(
        z
          .object({
            heading: text(200).default(""),
            body: text(3000).default(""),
            layout: z.enum(["TEXT", "SPLIT", "BANNER"]).default("TEXT"),
            imageUrl: z.string().max(2000).default(""),
            imageAssetId: z.string().max(100).nullable().default(null),
            imageAlt: text(300).default(""),
            ctaLabel: text(100).default(""),
            ctaUrl: z.string().max(2000).default(""),
          })
          .strict(),
      )
      .max(10)
      .default([]),
  })
  .strict();

/** Allowlisted create payload for ChatGPT draft writes. */
export const gptDraftCreateInput = z
  .object({
    kind: z.enum(["NEWSLETTER", "SOCIAL", "WEBSITE_REVIEW"]),
    title: text(200).min(1),
    campaignId: z.string().min(1).max(64).nullable().optional(),
    seriesId: z.string().min(1).max(64).nullable().optional(),
    websiteId: z.string().min(1).max(64).nullable().optional(),
    subject: text(250).default(""),
    preheader: text(300).default(""),
    body: text(30000).default(""),
    audience: text(2000).default(""),
    scheduledAt: instant.default(null),
    variants: z.array(socialVariant).max(3).default([]),
    newsletter: newsletterSnapshot.optional(),
    website: z
      .object({
        name: text(160).min(1).optional(),
        briefing: text(6000).default(""),
        language: z.enum(["de-CH", "de", "en", "fr", "it"]).default("de-CH"),
        accent: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .default("#00cbdc"),
        style: z.enum(["LIGHT", "DARK"]).default("LIGHT"),
        template: z
          .enum(["EDITORIAL", "CAMPAIGN", "PORTFOLIO"])
          .default("EDITORIAL"),
        footer: text(3000).default(""),
        pages: z.array(websitePagePatch).min(1).max(10),
      })
      .strict()
      .optional(),
    idempotencyKey: z.string().trim().min(8).max(128).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.kind === "NEWSLETTER") {
      if (!v.campaignId && !v.seriesId)
        ctx.addIssue({
          code: "custom",
          message: "Newsletter-Entwurf benötigt campaignId oder seriesId.",
        });
      if (!v.subject || !v.body || !v.audience || v.variants.length)
        ctx.addIssue({
          code: "custom",
          message:
            "Newsletter benötigt Betreff, Inhalt und Zielgruppe; keine Social-Varianten.",
        });
    }
    if (v.kind === "SOCIAL") {
      if (!v.campaignId && !v.seriesId)
        ctx.addIssue({
          code: "custom",
          message: "Social-Entwurf benötigt campaignId oder seriesId.",
        });
      if (
        !v.variants.length ||
        new Set(v.variants.map((x) => x.channel)).size !== v.variants.length
      )
        ctx.addIssue({
          code: "custom",
          message:
            "Pro Kanal genau eine Variante; mindestens ein Kanal erforderlich.",
        });
    }
    if (v.kind === "WEBSITE_REVIEW") {
      if (!v.website?.pages?.length)
        ctx.addIssue({
          code: "custom",
          message: "Website-Review benötigt website.pages.",
        });
      if (v.campaignId || v.seriesId)
        ctx.addIssue({
          code: "custom",
          message:
            "Website-Review-Entwürfe sind nicht an Kampagnen/Serien gebunden.",
        });
    }
  });

export type GptDraftCreateInput = z.infer<typeof gptDraftCreateInput>;

/** Allowlisted patch for updates — no status, delete, publish or owner changes. */
export const gptDraftUpdateInput = z
  .object({
    expectedVersion: z.number().int().positive(),
    title: text(200).min(1).optional(),
    subject: text(250).optional(),
    preheader: text(300).optional(),
    body: text(30000).optional(),
    audience: text(2000).optional(),
    scheduledAt: instant.optional(),
    variants: z.array(socialVariant).max(3).optional(),
    newsletter: newsletterSnapshot.optional(),
    website: z
      .object({
        name: text(160).min(1).optional(),
        briefing: text(6000).optional(),
        language: z.enum(["de-CH", "de", "en", "fr", "it"]).optional(),
        accent: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
        style: z.enum(["LIGHT", "DARK"]).optional(),
        template: z.enum(["EDITORIAL", "CAMPAIGN", "PORTFOLIO"]).optional(),
        footer: text(3000).optional(),
        pages: z.array(websitePagePatch).min(1).max(10).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type GptDraftUpdateInput = z.infer<typeof gptDraftUpdateInput>;

export const MAX_DRAFT_BODY_BYTES = 256_000;
