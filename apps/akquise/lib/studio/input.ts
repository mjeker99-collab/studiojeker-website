import { brandInput } from "../library/input";
import { z } from "zod";
import { graphicsSchema } from "./graphics";
export const ORG = "studiojeker";
export const studioChannels = ["LINKEDIN", "INSTAGRAM", "FACEBOOK"] as const;
export const formats = ["1:1", "4:5", "9:16"] as const;
const text = (n: number) =>
  z
    .string()
    .trim()
    .max(n)
    .overwrite((s) => s.replaceAll("ß", "ss"));
export const briefingSchema = z
  .object({
    title: text(200).min(1),
    topic: text(2000).min(1),
    offer: text(3000),
    goal: text(2000).min(1),
    audience: text(2000).min(1),
    tone: text(1000).min(1),
    channels: z
      .array(z.enum(studioChannels))
      .min(1)
      .max(3)
      .refine((a) => new Set(a).size === a.length),
    count: z.number().int().min(1).max(6),
    formats: z
      .array(z.enum(formats))
      .min(1)
      .max(3)
      .refine((a) => new Set(a).size === a.length),
    campaignId: z.string().min(1).nullable(),
    customerId: z.string().min(1).nullable().default(null),
    libraryReferenceIds: z.array(z.string().min(1)).max(4).optional(),
    brandRules: z
      .array(z.enum(["tone", "services", "audiences", "examples", "address"]))
      .max(5)
      .optional(),
    referenceAssetIds: z.array(z.string().min(1)).max(4),
  })
  .strict();
export const studioSnapshot = z
  .object({
    organizationId: z.literal(ORG),
    seriesId: z.string().min(1),
    brandVersion: z.literal("studio-v1"),
    brandProfile: brandInput.omit({ revision: true }).optional(),
    brandRevision: z.number().int().positive().optional(),
    brandLogoSha256: z.string().length(64).optional(),
    imageIdea: text(4000),
    headline: text(160),
    hashtags: text(1000),
    motifAssetId: z.string().nullable(),
    motifSha256: z.string().max(64),
    fontAssetId: z.string().nullable(),
    fontSha256: z.string().max(64),
    logoSha256: z.string().length(64),
    template: z.enum(["PHOTO", "PANEL"]),
    formats: z.array(z.enum(formats)).min(1).max(3),
    cropX: z.number().min(0).max(1),
    cropY: z.number().min(0).max(1),
    zoom: z.number().min(1).max(3),
    showLogo: z.boolean(),
    showClaim: z.boolean(),
    showHeadline: z.boolean(),
    graphics: graphicsSchema.optional(),
    source: z.enum(["OWN", "AI"]),
  })
  .strict();
export type Briefing = z.infer<typeof briefingSchema>;
export type StudioSnapshot = z.infer<typeof studioSnapshot>;
export type StudioFormat = (typeof formats)[number];
export const dimensions = {
  "1:1": [1080, 1080],
  "4:5": [1080, 1350],
  "9:16": [1080, 1920],
} as const;
export const generatedPostSchema = z
  .object({
    imageIdea: text(4000).min(1),
    headline: text(160).min(1),
    hashtags: text(1000),
    variants: z
      .array(
        z
          .object({
            channel: z.enum(studioChannels),
            text: text(12000).min(1),
            cta: text(300),
          })
          .strict(),
      )
      .min(1)
      .max(3),
  })
  .strict();
