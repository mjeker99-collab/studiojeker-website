import { z } from "zod";
// Validate URLs locally: OpenAI Structured Outputs does not support format: uri.
const httpUrl = z
  .string()
  .max(2000)
  .refine((v) => {
    try {
      const u = new URL(v);
      return (
        ["https:", "http:"].includes(u.protocol) && !u.username && !u.password
      );
    } catch {
      return false;
    }
  });
export const mailAssistantInput = z
  .object({
    requestKey: z.string().uuid(),
    mode: z.enum(["RESEARCH", "WRITE"]),
    briefing: z.string().trim().min(10).max(4000),
    region: z.string().trim().max(200).default(""),
    industry: z.string().trim().max(200).default(""),
    count: z.number().int().min(1).max(20).default(10),
    items: z
      .array(
        z
          .object({
            id: z.string().min(1),
            version: z.number().int().positive(),
          })
          .strict(),
      )
      .max(10)
      .default([]),
  })
  .strict()
  .refine(
    (v) =>
      v.mode !== "WRITE" ||
      (v.items.length > 0 &&
        new Set(v.items.map((i) => i.id)).size === v.items.length),
    "Mails auswählen.",
  );
export const leadSuggestion = z
  .object({
    organisation: z.string().min(1).max(250),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.union([z.literal(""), z.string().email().max(254)]),
    industry: z.string().max(200),
    region: z.string().max(200),
    position: z.string().max(300),
    website: httpUrl,
    sourceUrl: httpUrl,
    hook: z.string().min(1).max(2000),
    service: z.string().max(500),
  })
  .strict();
export const mailAssistantResult = z
  .object({
    leads: z.array(leadSuggestion).max(20),
    mails: z
      .array(
        z
          .object({
            id: z.string(),
            version: z.number().int().positive(),
            subject: z
              .string()
              .min(1)
              .max(250)
              .refine((v) => !/[\r\n]/.test(v)),
            body: z.string().min(1).max(12000),
          })
          .strict(),
      )
      .max(10),
    note: z.string().max(2000),
  })
  .strict();
export type AssistantInput = z.infer<typeof mailAssistantInput>;
export type AssistantResult = z.infer<typeof mailAssistantResult>;
