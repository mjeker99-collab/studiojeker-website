import { z } from "zod";
import {
  customerKnowledgeSchema,
  knowledgeFields,
  type CustomerKnowledge,
} from "../customer-knowledge";

export const assistantInput = z
  .object({
    requestKey: z.string().uuid(),
    name: z.string().trim().min(1).max(200),
    website: z
      .string()
      .trim()
      .max(2000)
      .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
      .refine((v) => {
        if (!v) return true;
        try {
          const u = new URL(v);
          return (
            u.protocol === "https:" &&
            !u.username &&
            !u.password &&
            !u.search &&
            !u.hash &&
            u.hostname.includes(".")
          );
        } catch {
          return false;
        }
      }, "Bitte eine öffentliche HTTPS-Firmenwebsite ohne Zugangsdaten oder URL-Parameter angeben."),
    knowledge: customerKnowledgeSchema,
    mode: z.enum(["RESEARCH", "WRITE"]),
  })
  .strict()
  .refine(
    (v) => v.mode !== "RESEARCH" || !!v.website,
    "Für die Recherche bitte die Firmenwebsite ergänzen.",
  )
  .refine(
    (v) =>
      v.mode !== "WRITE" || Object.values(v.knowledge).some((s) => s.trim()),
    "Für Textvorschläge bitte vorhandenes Unternehmenswissen eintragen.",
  );
export type AssistantInput = z.infer<typeof assistantInput>;
const keys = knowledgeFields.map(([key]) => key);
export const suggestionSchema = z
  .object({
    knowledge: z
      .object(
        Object.fromEntries(
          keys.map((key) => [key, z.string().max(2000)]),
        ) as Record<keyof CustomerKnowledge, z.ZodString>,
      )
      .strict(),
    citations: z
      .array(
        z.object({ field: z.enum(keys), url: z.string().max(2000) }).strict(),
      )
      .max(32),
    questions: z.array(z.string().max(400)).max(8),
  })
  .strict();
export type Suggestion = z.infer<typeof suggestionSchema>;
export type AssistantResult = Suggestion & {
  sources: { url: string; title: string }[];
  researchedAt: string;
  mode: "RESEARCH" | "WRITE";
};
export function fillEmptyKnowledge(
  current: CustomerKnowledge,
  proposed: CustomerKnowledge,
): CustomerKnowledge {
  return Object.fromEntries(
    keys.map((key) => [
      key,
      current[key].trim() ? current[key] : proposed[key],
    ]),
  ) as CustomerKnowledge;
}
