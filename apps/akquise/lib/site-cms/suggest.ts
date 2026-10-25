import { z } from "zod";
import { PolicyError } from "../policy";
import { openAIRequest, ProviderFailure } from "../studio/provider";
import { studioConfig } from "../studio/config";
import { fieldByKey, isTextKind, siteSuggestInput } from "./input";
import { findSitePage } from "./pages";
import { db } from "../db";
import { hubActor } from "../hub/workflow";
import { audit } from "../workflow";

const suggestionSchema = z
  .object({
    suggestion: z.string().min(1).max(4000),
    rationale: z.string().max(500),
  })
  .strict();

export async function siteCmsSuggest(actor: string, raw: unknown) {
  const input = siteSuggestInput.parse(raw);
  const page = findSitePage(input.pageKey);
  const field = fieldByKey(input.pageKey, input.fieldKey);
  if (!page || !field || !isTextKind(field.kind))
    throw new PolicyError("Für dieses Feld sind keine Textvorschläge möglich.");
  await hubActor(db, actor);
  const config = studioConfig();
  if (!config.connected)
    throw new PolicyError(
      "KI ist nicht konfiguriert. OPENAI-Zugang in StudioONE prüfen.",
      503,
    );
  const goalText =
    input.goal === "seo"
      ? "Optimiere für klare Suchresultate (SEO), ohne Keyword-Stuffing."
      : input.goal === "shorten"
        ? "Kürze den Text, behalte die Aussage."
        : "Formuliere den Text klarer und professioneller.";
  try {
    const { data, requestId } = await openAIRequest(
      "responses",
      JSON.stringify({
        model: config.textModel,
        store: false,
        max_output_tokens: 800,
        instructions: `Du bist der Website-Textassistent von StudioONE für studiojeker.ch. Antworte auf Schweizer Hochdeutsch. ${goalText} Erfinde keine Kunden, Zahlen, Awards oder Angebote. Markenclaim «We Create Visibility. Since 1992.» nicht verfälschen. suggestion enthält nur den vorgeschlagenen Feldtext (bei lokalisierten Feldern nur die angeforderte Sprache). rationale kurz.`,
        input: JSON.stringify({
          page: page.title,
          field: field.label,
          locale: input.locale,
          current: input.current,
          max: field.max || null,
        }),
        text: {
          format: {
            type: "json_schema",
            name: "site_cms_suggestion",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                suggestion: { type: "string" },
                rationale: { type: "string" },
              },
              required: ["suggestion", "rationale"],
            },
          },
        },
      }),
      true,
    );
    if (data.status !== "completed")
      throw new ProviderFailure(
        false,
        "KI hat keinen vollständigen Vorschlag geliefert.",
      );
    const output = (data.output || [])
      .flatMap(
        (o: { content?: { type: string; text?: string }[] }) => o.content || [],
      )
      .filter((p: { type: string }) => p.type === "output_text")
      .map((p: { text?: string }) => p.text || "")
      .join("");
    const result = suggestionSchema.parse(JSON.parse(output));
    if (field.max && [...result.suggestion].length > field.max)
      throw new PolicyError("KI-Vorschlag überschreitet die Feldlänge.");
    await db.$transaction(async (tx) => {
      await hubActor(tx, actor);
      await audit(tx, actor, "SITE_CMS_AI_SUGGESTED", page.id, {
        pageKey: page.key,
        fieldKey: field.key,
        goal: input.goal,
        requestId,
      });
    });
    return { ...result, applied: false as const };
  } catch (error) {
    if (error instanceof PolicyError) throw error;
    if (error instanceof ProviderFailure)
      throw new PolicyError(error.message, 502);
    throw new PolicyError("Textvorschlag fehlgeschlagen.", 502);
  }
}
