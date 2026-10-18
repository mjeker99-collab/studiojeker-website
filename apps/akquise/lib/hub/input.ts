import { newsletterSnapshot } from "./newsletter-template";
import { studioSnapshot } from "../studio/input";
import { z } from "zod";
const text = (max: number) => z.string().trim().max(max);
export const safeUrl = z.union([
  z.literal(""),
  z
    .string()
    .url()
    .max(2000)
    .refine((value) => {
      const u = new URL(value);
      return u.protocol === "https:" && !u.username && !u.password;
    }, "Öffentliche HTTPS-URL ohne Zugangsdaten erforderlich."),
]);
export const instant = z.string().datetime({ offset: true }).nullable();
export const channels = ["LINKEDIN", "INSTAGRAM", "FACEBOOK"] as const;
const variant = z
  .object({
    channel: z.enum(channels),
    text: text(12000).min(1),
    link: safeUrl,
    cta: text(300),
    mediaType: z.enum(["NONE", "IMAGE", "VIDEO"]),
    mediaUrl: safeUrl,
    mediaReference: text(1000),
    scheduledAt: instant,
  })
  .strict()
  .refine(
    (v) => v.mediaType === "NONE" || !!(v.mediaUrl || v.mediaReference),
    "Bild/Video benötigt eine URL oder dokumentierte Medienreferenz.",
  );
export const contentInput = z
  .object({
    studio: studioSnapshot.optional(),
    newsletter: newsletterSnapshot.optional(),
    kind: z.enum(["SOCIAL", "NEWSLETTER"]),
    title: text(200).min(1),
    ownerId: z.string().min(1),
    campaignId: z.string().min(1).nullable(),
    scheduledAt: instant,
    subject: text(250),
    preheader: text(300),
    body: text(30000),
    audience: text(2000),
    variants: z.array(variant).max(3),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.newsletter && v.kind !== "NEWSLETTER")
      ctx.addIssue({
        code: "custom",
        message: "Newsletter-Vorlage nur für Newsletter zulässig.",
      });
    if (
      v.kind === "SOCIAL" &&
      (!v.variants.length ||
        new Set(v.variants.map((x) => x.channel)).size !== v.variants.length)
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Pro Kanal genau eine Variante; mindestens ein Kanal erforderlich.",
      });
    if (
      v.kind === "NEWSLETTER" &&
      (!v.subject || !v.body || !v.audience || v.variants.length)
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Newsletter benötigt Betreff, Inhalt und Zielgruppenbeschreibung; keine Social-Varianten.",
      });
  });
export type ContentInput = z.infer<typeof contentInput>;
export const campaignInput = z
  .object({
    customerId: z.string().min(1).nullable().default(null),
    title: text(200).min(1),
    goal: text(3000).min(1),
    audience: text(2000).min(1),
    ownerId: z.string().min(1),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
  })
  .strict()
  .refine(
    (v) => new Date(v.endsAt) >= new Date(v.startsAt),
    "Ende muss nach Beginn liegen.",
  );
