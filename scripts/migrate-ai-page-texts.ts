/**
 * One-time, idempotent migration: fill empty KI/AI text fields into
 * Sanity DRAFT `drafts.ai` only — never patches published `_id: ai`.
 *
 * Source of approved copy: `studio/schemaTypes/aiDefaults.ts`
 *
 * SAFE:
 * - Writes exclusively to `drafts.ai`
 * - If the draft is missing, clones published `ai` into `drafts.ai` first
 * - Published `ai` is never created, patched, or replaced
 * - Never overwrites non-empty localized text or CTAs
 * - Never writes images, videos, Vimeo URLs, visualMedia, or landscapeBreaks
 * - Stable `_key` values on process steps and applications
 * - Auth: SANITY_AUTH_TOKEN only (no token fallback chain)
 * - Not run during build or deploy
 *
 * Usage:
 *   npx tsx scripts/migrate-ai-page-texts.ts --dry-run
 *   npx tsx scripts/migrate-ai-page-texts.ts --execute
 *
 * Default mode is dry-run (no writes).
 */
import { createClient, type SanityClient } from "@sanity/client";
import { aiPageInitialValues } from "../studio/schemaTypes/aiDefaults";

const projectId = "tgx6e6jg";
const dataset = "production";
const apiVersion = "2025-01-01";
const PUBLISHED_ID = "ai";
const DRAFT_ID = "drafts.ai";

type UnknownRecord = Record<string, unknown>;

function makeClient(token: string): SanityClient {
  return createClient({
    projectId,
    dataset,
    apiVersion,
    token,
    useCdn: false,
  });
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isEmptyLocalized(value: unknown): boolean {
  if (!value || typeof value !== "object") return true;
  const record = value as UnknownRecord;
  return !clean(record.de) && !clean(record.en);
}

function isEmptyCta(value: unknown): boolean {
  if (!value || typeof value !== "object") return true;
  const cta = value as UnknownRecord;
  return isEmptyLocalized(cta.label) && !clean(cta.href);
}

function isPlainObject(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isMediaField(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  return (
    value._type === "mediaField" ||
    "mediaType" in value ||
    "vimeoUrl" in value ||
    "image" in value ||
    "poster" in value
  );
}

/** Sanity image or media trees that must never be written by this script. */
function isMediaTreeKey(key: string): boolean {
  return (
    key === "media" ||
    key === "visualMedia" ||
    key === "landscapeBreaks" ||
    key === "ogImage" ||
    key === "image" ||
    key === "poster" ||
    key === "vimeoUrl"
  );
}

/**
 * Deep-fill text/CTA/arrays only. Skips every mediaField and media uploads.
 */
function fillEmptyTexts(
  existing: unknown,
  defaults: unknown,
  path = "",
): { value: unknown; filled: string[] } {
  const filled: string[] = [];

  if (defaults === undefined) {
    return { value: existing, filled };
  }

  // Never invent or overwrite media
  if (isMediaField(defaults) || isMediaField(existing)) {
    return { value: existing, filled };
  }

  // Localized string/text
  if (
    isPlainObject(defaults) &&
    ("de" in defaults || "en" in defaults) &&
    !("href" in defaults)
  ) {
    const looksLocalized = Object.keys(defaults).every((key) =>
      ["de", "en", "_type"].includes(key),
    );
    if (looksLocalized) {
      if (isEmptyLocalized(existing)) {
        filled.push(path || "(root)");
        return { value: defaults, filled };
      }
      return { value: existing, filled };
    }
  }

  // CTA
  if (
    isPlainObject(defaults) &&
    "href" in defaults &&
    ("label" in defaults || defaults._type === "ctaField")
  ) {
    if (isEmptyCta(existing)) {
      filled.push(path || "cta");
      return { value: defaults, filled };
    }
    const existingCta = (existing as UnknownRecord) || {};
    const next: UnknownRecord = { ...defaults, ...existingCta };
    if (isEmptyLocalized(existingCta.label) && defaults.label) {
      next.label = defaults.label;
      filled.push(`${path}.label`);
    }
    if (!clean(existingCta.href) && defaults.href) {
      next.href = defaults.href;
      filled.push(`${path}.href`);
    }
    return { value: next, filled };
  }

  // Arrays (steps / applications) — stable keys from defaults when empty
  if (Array.isArray(defaults)) {
    if (!Array.isArray(existing) || existing.length === 0) {
      filled.push(path || "array");
      return { value: defaults, filled };
    }
    const next = existing.map((item, index) => {
      const def = defaults[index];
      if (!def) return item;
      const result = fillEmptyTexts(item, def, `${path}[${index}]`);
      filled.push(...result.filled);
      return result.value;
    });
    return { value: next, filled };
  }

  if (isPlainObject(defaults)) {
    if (!isPlainObject(existing)) {
      // Strip media keys from section defaults before wholesale fill
      const scrubbed: UnknownRecord = {};
      for (const [key, defValue] of Object.entries(defaults)) {
        if (isMediaTreeKey(key) || isMediaField(defValue)) {
          continue;
        }
        scrubbed[key] = defValue;
      }
      filled.push(path || "(section)");
      return { value: scrubbed, filled };
    }

    const next: UnknownRecord = { ...existing };
    for (const [key, defValue] of Object.entries(defaults)) {
      if (path === "" && (key === "visualMedia" || key === "landscapeBreaks")) {
        continue;
      }
      if (isMediaTreeKey(key) || isMediaField(defValue)) {
        continue;
      }
      const childPath = path ? `${path}.${key}` : key;
      const result = fillEmptyTexts(existing[key], defValue, childPath);
      if (result.filled.length > 0) {
        next[key] = result.value;
        filled.push(...result.filled);
      }
    }
    return { value: next, filled };
  }

  if (existing === null || existing === undefined || existing === "") {
    filled.push(path || "(value)");
    return { value: defaults, filled };
  }
  return { value: existing, filled };
}

/** Read a nested value using fill paths like `heroSection.label` or `steps[0].title`. */
function valueAtPath(root: unknown, path: string): unknown {
  const tokens = path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);
  let current: unknown = root;
  for (const token of tokens) {
    if (Array.isArray(current) && /^\d+$/.test(token)) {
      current = current[Number(token)];
      continue;
    }
    if (!isPlainObject(current)) return undefined;
    current = current[token];
  }
  return current;
}

/**
 * Build a Sanity `.set()` map of dotted paths for filled leaves/sections only.
 * Never includes media trees.
 */
function buildTextOnlyPatchSet(
  merged: unknown,
  filled: string[],
): Record<string, unknown> {
  const setOps: Record<string, unknown> = {};

  for (const path of filled) {
    if (
      path === "visualMedia" ||
      path === "landscapeBreaks" ||
      path.endsWith(".media") ||
      path.endsWith(".ogImage") ||
      path.includes(".media.") ||
      path.includes("visualMedia") ||
      path.includes("landscapeBreaks")
    ) {
      continue;
    }

    const value = valueAtPath(merged, path);
    if (value === undefined) continue;

    // Sanity dotted paths do not use [index] — convert to numeric segments
    // only when setting a whole array via the parent path (already in `filled`).
    const sanityPath = path.replace(/\[(\d+)\]/g, ".$1");
    setOps[sanityPath] = value;
  }

  return setOps;
}

function extractVimeoUrl(section: unknown): string {
  if (!isPlainObject(section)) return "";
  const media = section.media;
  if (!isPlainObject(media)) return "";
  return clean(media.vimeoUrl);
}

function clonePublishedAsDraft(published: UnknownRecord): UnknownRecord {
  const clone = structuredClone(published) as UnknownRecord;
  delete clone._rev;
  delete clone._updatedAt;
  delete clone._createdAt;
  delete clone._updatedBy;
  delete clone._system;
  clone._id = DRAFT_ID;
  clone._type = "ai";
  return clone;
}

/** Auth with SANITY_AUTH_TOKEN only — no fallback chain, never log token values. */
async function resolveAuthClient(): Promise<SanityClient> {
  const token = process.env.SANITY_AUTH_TOKEN?.trim();

  if (!token) {
    console.error(
      "Missing SANITY_AUTH_TOKEN.\n" +
        "This migration requires SANITY_AUTH_TOKEN only (no other token fallback).",
    );
    process.exit(1);
  }

  const client = makeClient(token);
  try {
    const id = await client.fetch<string | null>(`*[_id == $id][0]._id`, {
      id: PUBLISHED_ID,
    });
    if (!id) {
      console.error(
        `Published document ${PUBLISHED_ID} not readable with SANITY_AUTH_TOKEN.`,
      );
      process.exit(1);
    }
    console.log("Using token from SANITY_AUTH_TOKEN.");
    return client;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`SANITY_AUTH_TOKEN failed: ${message}`);
    process.exit(1);
  }
}

async function main() {
  const execute = process.argv.includes("--execute");
  const dryRun = !execute || process.argv.includes("--dry-run");

  if (execute && process.argv.includes("--dry-run")) {
    console.error("Pass either --dry-run (default) or --execute, not both.");
    process.exit(1);
  }

  const client = await resolveAuthClient();

  const published = (await client.getDocument(PUBLISHED_ID).catch(() => null)) as
    | UnknownRecord
    | null;
  if (!published) {
    console.error(
      `Published document ${PUBLISHED_ID} missing. Create the KI / AI singleton in Studio first.`,
    );
    process.exit(1);
  }

  const existingDraft = (await client
    .getDocument(DRAFT_ID)
    .catch(() => null)) as UnknownRecord | null;
  const draftExists = Boolean(existingDraft);

  // Fill against draft when present; otherwise against published (as clone basis).
  const base = existingDraft ?? published;
  const defaults = structuredClone(aiPageInitialValues);
  const { value, filled } = fillEmptyTexts(base, defaults);
  const patchSet = buildTextOnlyPatchSet(value, filled);

  const heroVimeo = extractVimeoUrl(base.heroSection);
  const showreelVimeo = extractVimeoUrl(base.showreelSection);

  console.log(`Dataset: ${dataset}`);
  console.log(`Target (writes): ${DRAFT_ID}`);
  console.log(`Published document: ${PUBLISHED_ID} (never modified by this script)`);
  console.log(
    `Draft status: ${draftExists ? "exists" : "missing — will clone published → drafts.ai before text fill"}`,
  );
  console.log(`Mode: ${dryRun ? "DRY-RUN (no writes)" : "EXECUTE (draft only)"}`);
  console.log(`Hero Vimeo (preserved): ${heroVimeo || "(none)"}`);
  console.log(`Showreel Vimeo (preserved): ${showreelVimeo || "(none)"}`);
  console.log(`Other Sanity documents: not touched`);

  if (filled.length === 0) {
    console.log("Nothing to fill — all text fields already populated on the base document.");
    return;
  }

  console.log(
    `Would fill ${filled.length} empty text path(s) on ${DRAFT_ID} (media never written):`,
  );
  for (const path of filled) {
    console.log(`  - ${path}`);
  }
  console.log(`Patch keys (${Object.keys(patchSet).length}):`);
  for (const key of Object.keys(patchSet)) {
    console.log(`  - set ${key}`);
  }

  if (dryRun) {
    console.log("\nDry-run only. Published `ai` unchanged. To write draft:");
    console.log("  npx tsx scripts/migrate-ai-page-texts.ts --execute");
    return;
  }

  // --- EXECUTE: draft only -------------------------------------------------

  if (!draftExists) {
    const draftDoc = clonePublishedAsDraft(published);
    try {
      await client.createOrReplace(draftDoc);
      console.log(
        `Created ${DRAFT_ID} as full clone of published ${PUBLISHED_ID} (media preserved).`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to create ${DRAFT_ID}: ${message}`);
      process.exit(1);
    }
  }

  if (Object.keys(patchSet).length === 0) {
    console.log("No text-only patch keys — aborting without writes.");
    return;
  }

  // Hard guard: refuse if any patch key looks like media
  for (const key of Object.keys(patchSet)) {
    if (
      key === "visualMedia" ||
      key === "landscapeBreaks" ||
      key === "media" ||
      key.endsWith(".media") ||
      key.endsWith(".ogImage") ||
      key.endsWith(".vimeoUrl") ||
      key.includes("visualMedia") ||
      key.includes("landscapeBreaks")
    ) {
      console.error(`Refusing to write media path: ${key}`);
      process.exit(1);
    }
  }

  try {
    await client
      .patch(DRAFT_ID)
      .set(patchSet)
      .commit({ autoGenerateArrayKeys: true });
    console.log(
      `Patched ${DRAFT_ID} only: filled ${filled.length} text path(s).`,
    );
    console.log(
      `Published ${PUBLISHED_ID} was not modified. Review draft in Studio → Publish when ready.`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Write to ${DRAFT_ID} failed: ${message}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
