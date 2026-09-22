/**
 * Fill empty KI/AI Sanity fields with live frontend defaults.
 *
 * SAFE: never overwrites non-empty localized text, CTAs, media assets,
 * Vimeo URLs, or visualMedia / landscapeBreaks uploads. Only writes missing / blank paths.
 *
 * Usage: npx tsx scripts/fill-ai-page-defaults.ts
 *        npx tsx scripts/fill-ai-page-defaults.ts --dry-run
 */
import { createClient, type SanityClient } from "@sanity/client";
import { aiPageInitialValues } from "../studio/schemaTypes/aiDefaults";
import {
  fillAiEmptyFields,
  type UnknownRecord,
} from "../studio/lib/fillAiEmptyFields";

const projectId = "tgx6e6jg";
const dataset = "production";
const apiVersion = "2025-01-01";
const AI_ID = "ai";

function makeClient(token: string): SanityClient {
  return createClient({
    projectId,
    dataset,
    apiVersion,
    token,
    useCdn: false,
  });
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
        "Manual: Studio → KI / AI → document action “Fill empty fields from approved /ki copy” → Publish.",
    );
    process.exit(1);
  }

  for (const [name, token] of candidates) {
    const client = makeClient(token);
    try {
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
  const { value, filled } = fillAiEmptyFields(existing, defaults);

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
  delete body._updatedBy;

  try {
    await client.patch(AI_ID).set(body).commit({ autoGenerateArrayKeys: true });
    console.log(
      `Patched ${AI_ID}: filled ${filled.length} empty path(s). Open Studio → KI / AI and Publish if needed.`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Write failed (${message}).`);
    if (/permission|unauthorized|forbidden/i.test(message)) {
      console.error(
        "Token lacks update permission.\n" +
          "Manual: Studio → KI / AI → “Fill empty fields from approved /ki copy” → Publish.\n" +
          "Or re-run with a token that has Editor create+update on production.",
      );
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
