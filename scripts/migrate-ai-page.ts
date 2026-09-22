/**
 * Seed the KI / AI singleton (`_id: ai`) once.
 *
 * Does NOT overwrite existing Studio edits. Content matches
 * `studio/schemaTypes/aiDefaults.ts` and live `/ki` fallbacks.
 *
 * Usage: npx tsx scripts/migrate-ai-page.ts
 * (or: node scripts/migrate-ai-page.mjs → forwards to tsx)
 */
import { createReadStream, existsSync } from "node:fs";
import { basename } from "node:path";
import { createClient, type SanityClient } from "@sanity/client";
import { aiPageInitialValues } from "../studio/schemaTypes/aiDefaults";

const projectId = "tgx6e6jg";
const dataset = "production";
const apiVersion = "2025-01-01";
const AI_ID = "ai";
const PROBE_ID = "ai-write-probe";

const HERO_IMAGE =
  "public/images/Social marketing/Social marketing/PHOTO-2023-05-11-15-00-27.jpg";

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
        "Provide a Sanity token with create+write on dataset production,\n" +
        "or open “KI / AI” in Studio (initial values prefill) and publish.",
    );
    process.exit(1);
  }

  const failures: string[] = [];

  for (const [name, token] of candidates) {
    const client = makeClient(token);
    try {
      await client.createIfNotExists({
        _id: PROBE_ID,
        _type: "ai",
        heroSection: {
          label: { _type: "localizedString", de: "probe", en: "probe" },
        },
      });
      await client.delete(PROBE_ID);
      console.log(`Using writable token from ${name}.`);
      return client;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${name}: ${message.split("\n")[0]}`);
      try {
        await client.delete(PROBE_ID);
      } catch {
        // Probe may never have been created.
      }
    }
  }

  console.error(
    "No writable Sanity token available to create `_id: ai`.\n" +
      "Failures:\n- " +
      failures.join("\n- ") +
      "\n\nManual steps:\n" +
      "1. Create a Sanity API token with Editor (create+write) on tgx6e6jg / production.\n" +
      "2. Set SANITY_API_WRITE_TOKEN and re-run: npx tsx scripts/migrate-ai-page.ts\n" +
      "3. Or open “KI / AI” in Studio and publish once (initialValue prefills copy).",
  );
  process.exit(1);
}

async function resolveHeroImageRef(
  client: SanityClient,
): Promise<string | null> {
  if (existsSync(HERO_IMAGE)) {
    try {
      const asset = await client.assets.upload(
        "image",
        createReadStream(HERO_IMAGE),
        { filename: basename(HERO_IMAGE) },
      );
      console.log(`Uploaded hero image → ${asset._id}`);
      return asset._id;
    } catch (error) {
      console.warn(
        `Image upload failed (${error instanceof Error ? error.message : error}). Trying Content-Abo hero asset.`,
      );
    }
  }

  const existingRef = await client.fetch<string | null>(
    `*[_id == "abo"][0].heroSection.media.image.asset._ref`,
  );
  if (typeof existingRef === "string" && existingRef) {
    console.log(`Reusing Content-Abo hero image → ${existingRef}`);
    return existingRef;
  }

  console.warn("No hero image asset available — seeding text + showreel only.");
  return null;
}

async function main() {
  const client = await resolveWritableClient();

  const existing = await client.getDocument(AI_ID).catch(() => null);
  if (existing) {
    console.log(
      `KI/AI singleton ${AI_ID} already exists (_updatedAt=${existing._updatedAt}). Skipping seed to preserve Studio edits.`,
    );
    return;
  }

  const defaults = structuredClone(aiPageInitialValues);
  const imageRef = await resolveHeroImageRef(client);

  const doc = {
    _id: AI_ID,
    _type: "ai" as const,
    ...defaults,
    ...(imageRef
      ? {
          heroSection: {
            ...defaults.heroSection,
            media: {
              _type: "mediaField" as const,
              mediaType: "image",
              image: {
                _type: "image" as const,
                asset: { _type: "reference" as const, _ref: imageRef },
                alt: "Studiojeker visuelle Produktion",
              },
            },
          },
          seoSection: {
            ...defaults.seoSection,
            ogImage: {
              _type: "image" as const,
              asset: { _type: "reference" as const, _ref: imageRef },
            },
          },
        }
      : {}),
    showreelSection: {
      ...defaults.showreelSection,
      media: {
        _type: "mediaField" as const,
        mediaType: "video",
        vimeoUrl:
          defaults.showreelSection.media.vimeoUrl ||
          "https://vimeo.com/1228871502",
      },
    },
  };

  await client.createOrReplace(doc);
  console.log(`Created KI/AI singleton ${AI_ID}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
