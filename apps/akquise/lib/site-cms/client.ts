import { PolicyError } from "../policy";
import {
  getSanityReadToken,
  getSanityWriteToken,
  siteCmsApiVersion,
  siteCmsDataset,
  siteCmsProject,
} from "./config";

const base = `https://${siteCmsProject}.api.sanity.io/v${siteCmsApiVersion}`;

async function readBody(response: Response, max = 1_500_000) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Leere Antwort.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw new Error("Antwort zu gross.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

async function sanityFetch(
  url: URL,
  init: RequestInit & { token?: string },
): Promise<unknown> {
  const { token, ...rest } = init;
  try {
    const response = await fetch(url, {
      ...rest,
      headers: {
        ...(rest.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error(`HTTP ${response.status}`);
    }
    const bytes = await readBody(response);
    return JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    if (error instanceof PolicyError) throw error;
    throw new PolicyError(
      "Sanity ist nicht erreichbar. Verbindung und Token prüfen.",
      502,
    );
  }
}

/** GROQ query against the fixed Studiojeker project/dataset. */
export async function siteQuery(
  query: string,
  params: Record<string, unknown> = {},
  options: { perspective?: "published" | "previewDrafts" } = {},
) {
  const url = new URL(`${base}/data/query/${siteCmsDataset}`);
  url.searchParams.set("query", query);
  url.searchParams.set("perspective", options.perspective || "published");
  for (const [key, value] of Object.entries(params))
    url.searchParams.set("$" + key, JSON.stringify(value));
  // Reads: published needs no token; drafts need a dedicated read token.
  // Never send the write token on queries — expired Editor tokens would 401.
  const token =
    options.perspective === "previewDrafts" ? getSanityReadToken() : undefined;
  if (options.perspective === "previewDrafts" && !token)
    throw new PolicyError(
      "Entwürfe benötigen SANITY_API_READ_TOKEN (serverseitig).",
      503,
    );
  const result = (await sanityFetch(url, {
    method: "GET",
    token,
  })) as { result?: unknown };
  if (!("result" in result)) throw new PolicyError("Ungültige Sanity-Antwort.");
  return result.result;
}

type Mutation =
  | { createIfNotExists: Record<string, unknown> }
  | { createOrReplace: Record<string, unknown> }
  | { patch: { id: string; set?: Record<string, unknown>; unset?: string[] } }
  | { delete: { id: string } };

export async function siteMutate(mutations: Mutation[]) {
  const token = getSanityWriteToken();
  if (!token)
    throw new PolicyError(
      "Schreibzugriff nicht konfiguriert. SANITY_API_WRITE_TOKEN serverseitig setzen.",
      503,
    );
  const url = new URL(`${base}/data/mutate/${siteCmsDataset}`);
  url.searchParams.set("returnIds", "true");
  url.searchParams.set("returnDocuments", "false");
  const result = (await sanityFetch(url, {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mutations }),
  })) as { results?: { id?: string }[]; documentIds?: string[] };
  return result;
}

/** Publish a draft via Sanity Actions API (does not auto-deploy the website). */
export async function sitePublishAction(publishedId: string, draftDocumentId: string) {
  const token = getSanityWriteToken();
  if (!token)
    throw new PolicyError(
      "Schreibzugriff nicht konfiguriert. SANITY_API_WRITE_TOKEN serverseitig setzen.",
      503,
    );
  const url = new URL(`${base}/data/actions/${siteCmsDataset}`);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        actions: [
          {
            actionType: "sanity.action.document.publish",
            publishedId,
            draftId: draftDocumentId,
          },
        ],
      }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error(`HTTP ${response.status}`);
    }
    await readBody(response, 200_000);
  } catch (error) {
    if (error instanceof PolicyError) throw error;
    throw new PolicyError(
      "Veröffentlichung in Sanity fehlgeschlagen. Berechtigung und Entwurf prüfen.",
      502,
    );
  }
}

export async function siteUploadImage(
  bytes: Buffer,
  filename: string,
  contentType: string,
): Promise<{ assetId: string; url: string }> {
  const token = getSanityWriteToken();
  if (!token)
    throw new PolicyError(
      "Schreibzugriff nicht konfiguriert. SANITY_API_WRITE_TOKEN serverseitig setzen.",
      503,
    );
  if (bytes.byteLength > 4_500_000)
    throw new PolicyError("Bild darf höchstens 4,5 MB gross sein.", 413);
  const url = new URL(`${base}/assets/images/${siteCmsDataset}`);
  url.searchParams.set("filename", filename);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": contentType,
      },
      body: new Uint8Array(bytes),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = JSON.parse(
      (await readBody(response, 200_000)).toString("utf8"),
    ) as { document?: { _id?: string; url?: string } };
    const assetId = payload.document?._id;
    const assetUrl = payload.document?.url;
    if (!assetId || !assetUrl)
      throw new Error("Asset-Antwort unvollständig.");
    return { assetId, url: assetUrl };
  } catch (error) {
    if (error instanceof PolicyError) throw error;
    throw new PolicyError(
      "Bild-Upload zu Sanity fehlgeschlagen. Token und Dateityp prüfen.",
      502,
    );
  }
}
