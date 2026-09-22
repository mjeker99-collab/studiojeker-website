/**
 * Fill empty KI/AI Sanity fields with live frontend defaults.
 *
 * SAFE: never overwrites non-empty localized text, CTAs, media assets,
 * Vimeo URLs, or visualMedia uploads. Only writes missing / blank paths.
 *
 * Usage: npx tsx scripts/fill-ai-page-defaults.ts
 *
 * Field map (Sanity → frontend):
 * heroSection → hero
 * introSection → intro (+ optional media/caption)
 * processSection → process
 * showreelSection → showreel
 * applicationsSection → applications (+ optional media/caption)
 * modelsSection / experienceSection / approachSection → models / experience / approach
 * visualMedia → optional stills (left empty — editors upload)
 * closingSection / clientsLabel / seoSection → closing / clients / seo
 */
import { createClient, type SanityClient } from "@sanity/client";
import { aiPageInitialValues } from "../studio/schemaTypes/aiDefaults";

const projectId = "tgx6e6jg";
const dataset = "production";
const apiVersion = "2025-01-01";
const AI_ID = "ai";

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

function hasMediaContent(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const media = value as UnknownRecord;
  if (clean(media.vimeoUrl)) return true;
  const image = media.image as UnknownRecord | undefined;
  const poster = media.poster as UnknownRecord | undefined;
  const imageAsset = image?.asset as UnknownRecord | undefined;
  const posterAsset = poster?.asset as UnknownRecord | undefined;
  return Boolean(imageAsset?._ref || posterAsset?._ref);
}

function isEmptyCta(value: unknown): boolean {
  if (!value || typeof value !== "object") return true;
  const cta = value as UnknownRecord;
  return isEmptyLocalized(cta.label) && !clean(cta.href);
}

function isPlainObject(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Deep-fill: copy from defaults only where existing is missing/blank.
 * Arrays: if existing is empty/missing, take defaults wholesale; otherwise
 * fill each item by index without replacing populated fields.
 */
function fillEmpty(
  existing: unknown,
  defaults: unknown,
  path = "",
): { value: unknown; filled: string[] } {
  const filled: string[] = [];

  if (defaults === undefined) {
    return { value: existing, filled };
  }

  // Localized string/text objects
  if (
    isPlainObject(defaults) &&
    ("de" in defaults || "en" in defaults) &&
    !("mediaType" in defaults) &&
    !("href" in defaults) &&
    !("_type" in defaults && (defaults as UnknownRecord)._type === "mediaField")
  ) {
    const looksLocalized =
      Object.keys(defaults).every((key) =>
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

  // mediaField
  if (
    isPlainObject(defaults) &&
    (defaults._type === "mediaField" || "mediaType" in defaults)
  ) {
    if (hasMediaContent(existing)) {
      return { value: existing, filled };
    }
    // Prefer defaults when existing media is empty (e.g. showreel Vimeo).
    if (!hasMediaContent(defaults)) {
      return { value: existing ?? defaults, filled };
    }
    filled.push(path || "media");
    return { value: defaults, filled };
  }

  // CTA (must include href — section objects also have a "label" key)
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

  // Arrays (steps / applications)
  if (Array.isArray(defaults)) {
    if (!Array.isArray(existing) || existing.length === 0) {
      filled.push(path || "array");
      return { value: defaults, filled };
    }
    const next = existing.map((item, index) => {
      const def = defaults[index];
      if (!def) return item;
      const result = fillEmpty(item, def, `${path}[${index}]`);
      filled.push(...result.filled);
      return result.value;
    });
    return { value: next, filled };
  }

  // Nested objects / sections
  if (isPlainObject(defaults)) {
    if (!isPlainObject(existing)) {
      filled.push(path || "(section)");
      return { value: defaults, filled };
    }
    const next: UnknownRecord = { ...existing };
    for (const [key, defValue] of Object.entries(defaults)) {
      // Never invent visualMedia or landscapeBreaks uploads.
      if (path === "" && (key === "visualMedia" || key === "landscapeBreaks")) {
        continue;
      }
      const childPath = path ? `${path}.${key}` : key;
      const result = fillEmpty(existing[key], defValue, childPath);
      if (result.filled.length > 0) {
        next[key] = result.value;
        filled.push(...result.filled);
      }
    }
    return { value: next, filled };
  }

  // Primitive: fill only when existing is blank
  if (existing === null || existing === undefined || existing === "") {
    filled.push(path || "(value)");
    return { value: defaults, filled };
  }
  return { value: existing, filled };
}

async function resolveWritableClient(): Promise<SanityClient> {
  const rawCandidates: Array<[string, string | undefined]> = [
    ["SANITY_API_WRITE_TOKEN", process.env.SANITY_API_WRITE_TOKEN],
    ["SANITY_AUTH_TOKEN", process.env.SANITY_AUTH_TOKEN],
  ];
  const candidates = rawCandidates.filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === "string" && entry[1].trim().length > 0,
  );

  if (candidates.length === 0) {
    console.error(
      "Missing SANITY_API_WRITE_TOKEN or SANITY_AUTH_TOKEN.\n" +
        "Cannot fill empty KI/AI fields automatically.\n" +
        "Manual: open Studio → KI / AI and paste values from studio/schemaTypes/aiDefaults.ts, then publish.",
    );
    process.exit(1);
  }

  for (const [name, token] of candidates) {
    const client = makeClient(token);
    try {
      // Lightweight auth check
      await client.fetch(`*[_id == $id][0]._id`, { id: AI_ID });
      console.log(`Using token from ${name}.`);
      return client;
    } catch (error) {
      console.warn(
        `${name} failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  console.error("No usable Sanity token for fill-empty.");
  process.exit(1);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const client = await resolveWritableClient();
  const existing = await client.getDocument(AI_ID).catch(() => null);

  if (!existing) {
    console.log(
      `Document ${AI_ID} missing. Run: npx tsx scripts/migrate-ai-page.ts`,
    );
    process.exit(1);
  }

  const defaults = structuredClone(aiPageInitialValues);
  const { value, filled } = fillEmpty(existing, defaults);

  if (filled.length === 0) {
    console.log(
      `KI/AI ${AI_ID} already has all default text fields populated. Nothing to fill.`,
    );
    return;
  }

  console.log(
    `Would fill ${filled.length} empty path(s) on ${AI_ID} (existing media/edits preserved):`,
  );
  for (const path of filled.slice(0, 60)) {
    console.log(`  - ${path}`);
  }
  if (filled.length > 60) {
    console.log(`  … +${filled.length - 60} more`);
  }

  if (dryRun) {
    console.log("Dry run only — no writes.");
    return;
  }

  const next = value as UnknownRecord;
  const body = { ...next };
  delete body._id;
  delete body._type;
  delete body._rev;
  delete body._createdAt;
  delete body._updatedAt;
  delete body._system;

  try {
    await client
      .patch(AI_ID)
      .set(body)
      .commit({ autoGenerateArrayKeys: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `Write failed (${message}).\n` +
        "Token lacks update permission.\n" +
        "Manual: Studio → KI / AI → ensure sections match aiDefaults.ts → Publish.\n" +
        "Or re-run with a token that has Editor create+update on production.",
    );
    process.exit(1);
  }

  console.log(`Patched ${AI_ID}. Publish in Studio if still a draft.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
