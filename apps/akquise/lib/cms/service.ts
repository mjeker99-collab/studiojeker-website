import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "../db";
import { PolicyError } from "../policy";
import { audit } from "../workflow";
import { hubActor, saveContentInTx } from "../hub/workflow";
import { cmsImportInput, cmsTemplates, newsletterFromSanity } from "./input";

// This integration intentionally targets the existing Studiojeker project only.
const project = "tgx6e6jg";
const dataset = "production";
export const studioUrl = "https://studiojeker.sanity.studio/structure";
const types = cmsTemplates.map((t) => t.type);
const projection = [
  ...new Map(
    cmsTemplates.flatMap((t) => t.fields).map((f) => [f.name, f]),
  ).values(),
]
  .map((f) =>
    f.kind === "image"
      ? `"${f.name}": select(defined(${f.name}.image.asset._ref) => ${f.name}.image.asset->url, ${f.name}.url)`
      : f.name,
  )
  .join(",");

export async function querySanity(
  query: string,
  params: Record<string, unknown> = {},
) {
  const url = new URL(
    `https://${project}.api.sanity.io/v2025-02-19/data/query/${dataset}`,
  );
  url.searchParams.set("query", query);
  url.searchParams.set("perspective", "published");
  for (const [key, value] of Object.entries(params))
    url.searchParams.set("$" + key, JSON.stringify(value));
  const token = process.env.SANITY_API_READ_TOKEN?.trim();
  try {
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Sanity-Anfrage fehlgeschlagen.");
    // Bound provider responses; never return upstream errors or authentication data.
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Leere Antwort.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 1_000_000) {
          await reader.cancel();
          throw new Error("Antwort zu gross.");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!("result" in result)) throw new Error("Ungültige Antwort.");
    return result.result as unknown;
  } catch {
    throw new PolicyError(
      "Sanity ist nicht erreichbar. Verbindung und gegebenenfalls Lesetoken prüfen.",
      502,
    );
  }
}
const summary = z.object({
  _id: cmsImportInput.shape.id,
  _rev: z.string().min(1).max(200),
  title: z.string().max(200).nullable(),
  subject: z.string().max(250).nullable(),
  _updatedAt: z.string(),
});
export async function cmsState(actor: string) {
  await hubActor(db, actor);
  const documents = z
    .array(summary)
    .parse(
      await querySanity(
        '*[_type in $types && !(_id in path("drafts.**")) && !(_id in path("versions.**"))] | order(_updatedAt desc)[0...100]{_id,_rev,title,subject,_updatedAt}',
        { types },
      ),
    );
  return { studioUrl, documents };
}
export async function importSanityNewsletter(actor: string, raw: unknown) {
  const input = cmsImportInput.parse(raw);
  await hubActor(db, actor);
  const doc = await querySanity(
    `*[_id == $id && _type in $types][0]{_id,_rev,_type,title,subject,preheader,audience,${projection}}`,
    { id: input.id, types },
  );
  if (!doc)
    throw new PolicyError(
      "Newsletter ist nicht mehr in Sanity bereitgestellt. Liste neu laden.",
      409,
    );
  const revision = z.object({ _rev: z.string() }).parse(doc)._rev;
  if (revision !== input.revision)
    throw new PolicyError(
      "Newsletter wurde in Sanity geändert. Liste neu laden.",
      409,
    );
  let payload;
  try {
    payload = newsletterFromSanity(doc, actor);
  } catch {
    throw new PolicyError(
      "Sanity-Newsletter ist unvollständig oder ungültig. Bitte Texte, Zielgruppe und Bild-/Ziel-Links in Sanity prüfen.",
    );
  }
  const key = createHash("sha256")
    .update(JSON.stringify([project, dataset, input.id, revision]))
    .digest("hex");
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"sanity:" + key}))`;
    const previous = await tx.audit.findFirst({
      where: { action: "SANITY_NEWSLETTER_IMPORTED", entityId: key },
    });
    if (previous) return { imported: false };
    const content = await saveContentInTx(tx, actor, payload);
    await audit(tx, actor, "SANITY_NEWSLETTER_IMPORTED", key, {
      project,
      dataset,
      documentId: input.id,
      revision,
      contentId: content.id,
    });
    return { imported: true, contentId: content.id };
  });
}
