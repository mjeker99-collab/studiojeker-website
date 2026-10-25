import { z } from "zod";
import { findSitePage, type EditableField, type FieldKind } from "./pages";

const localized = z
  .object({
    de: z.string().max(4000).optional(),
    en: z.string().max(4000).optional(),
  })
  .strict();

export const sitePageKey = z
  .string()
  .min(1)
  .max(40)
  .refine((key) => Boolean(findSitePage(key)), "Unbekannte Seite.");

export const siteSaveInput = z
  .object({
    pageKey: sitePageKey,
    revision: z.string().min(1).max(200),
    values: z.record(z.string(), z.unknown()),
  })
  .strict();

export const sitePublishInput = z
  .object({
    pageKey: sitePageKey,
    revision: z.string().min(1).max(200),
    confirmed: z.literal(true),
  })
  .strict();

export const siteSuggestInput = z
  .object({
    pageKey: sitePageKey,
    fieldKey: z.string().min(1).max(80),
    locale: z.enum(["de", "en"]).default("de"),
    current: z.string().max(4000),
    goal: z.enum(["rewrite", "shorten", "seo"]).default("rewrite"),
  })
  .strict();

export const siteMediaInput = z
  .object({
    pageKey: sitePageKey,
    fieldKey: z.string().min(1).max(80),
    revision: z.string().min(1).max(200),
    filename: z
      .string()
      .min(1)
      .max(180)
      .regex(/^[\w.\- ()]+\.(jpe?g|png|webp)$/i),
    contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    /** Base64 without data: prefix. Max ~4.5 MB decoded. */
    data: z.string().min(1).max(6_500_000),
    alt: z.string().max(160).optional(),
  })
  .strict();

function assertLength(value: string, field: EditableField) {
  if (field.max && [...value].length > field.max)
    throw new Error(`${field.label} ist zu lang (max. ${field.max}).`);
}

function normalizeLocalized(
  raw: unknown,
  field: EditableField,
): { de?: string; en?: string } {
  const value = localized.parse(raw ?? {});
  if (value.de !== undefined) assertLength(value.de, field);
  if (value.en !== undefined) assertLength(value.en, field);
  return value;
}

function normalizeString(raw: unknown, field: EditableField): string {
  const value = z.string().parse(raw ?? "");
  assertLength(value, field);
  return value;
}

/** Validate UI values against the allowlisted field catalogue. */
export function validatedFieldValues(
  pageKey: string,
  values: Record<string, unknown>,
): Record<string, unknown> {
  const page = findSitePage(pageKey);
  if (!page) throw new Error("Unbekannte Seite.");
  const allowed = new Map(page.fields.map((field) => [field.key, field]));
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(values)) {
    const field = allowed.get(key);
    if (!field) throw new Error(`Feld «${key}» ist nicht freigegeben.`);
    if (field.kind === "image" || field.kind === "mediaImage")
      throw new Error("Bilder über den Medien-Upload ersetzen.");
    out[key] =
      field.kind === "localizedString" || field.kind === "localizedText"
        ? normalizeLocalized(raw, field)
        : normalizeString(raw, field);
  }
  return out;
}

export function fieldByKey(
  pageKey: string,
  fieldKey: string,
): EditableField | undefined {
  return findSitePage(pageKey)?.fields.find((field) => field.key === fieldKey);
}

export function isTextKind(kind: FieldKind): boolean {
  return (
    kind === "string" ||
    kind === "text" ||
    kind === "localizedString" ||
    kind === "localizedText"
  );
}
