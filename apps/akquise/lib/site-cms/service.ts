import { z } from "zod";
import { db } from "../db";
import { PolicyError } from "../policy";
import { hubActor } from "../hub/workflow";
import { audit } from "../workflow";
import {
  getSanityReadToken,
  getSanityWriteToken,
  siteCmsLiveUrl,
  siteCmsPublishAllowed,
  siteCmsStagingUrl,
  siteCmsStudioUrl,
} from "./config";
import {
  siteMutate,
  sitePublishAction,
  siteQuery,
  siteUploadImage,
} from "./client";
import {
  fieldByKey,
  siteMediaInput,
  sitePublishInput,
  siteSaveInput,
  validatedFieldValues,
} from "./input";
import {
  draftId,
  findSitePage,
  sitePages,
  type EditableField,
  type SitePage,
} from "./pages";

const localizedValue = z
  .object({
    de: z.string().nullable().optional(),
    en: z.string().nullable().optional(),
  })
  .passthrough();

function emptyValues(page: SitePage): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of page.fields) {
    if (field.kind === "localizedString" || field.kind === "localizedText")
      values[field.key] = { de: "", en: "" };
    else if (field.kind === "image" || field.kind === "mediaImage")
      values[field.key] = { url: "", alt: "" };
    else values[field.key] = "";
  }
  return values;
}

function readPath(doc: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, doc);
}

function extractFieldValue(doc: Record<string, unknown>, field: EditableField) {
  if (field.kind === "mediaImage") {
    const media = readPath(doc, field.path) as
      | { image?: { asset?: { url?: string }; alt?: string }; alt?: string }
      | undefined;
    return {
      url: media?.image?.asset?.url || "",
      alt: media?.image?.alt || media?.alt || "",
    };
  }
  if (field.kind === "image") {
    const image = readPath(doc, field.path) as
      | { asset?: { url?: string }; alt?: string }
      | undefined;
    return { url: image?.asset?.url || "", alt: image?.alt || "" };
  }
  const raw = readPath(doc, field.path);
  if (field.kind === "localizedString" || field.kind === "localizedText") {
    const value = localizedValue.safeParse(raw);
    return {
      de: value.success ? value.data.de || "" : "",
      en: value.success ? value.data.en || "" : "",
    };
  }
  return typeof raw === "string" ? raw : "";
}

const editorProjection = `{
  _id, _rev, _type, _updatedAt,
  heroHeadline, heroSubheadline, heroIntroText, seoTitle, seoDescription,
  heroSection{
    headline{de,en}, subheadline{de,en}, intro{de,en}, text{de,en},
    media{mediaType,alt,image{alt,asset->{url}}}
  },
  heroImage{alt,asset->{url}},
  seoSection{title{de,en},description{de,en}}
}`;

/**
 * Draft reads use the read token only. Write tokens are reserved for
 * mutations/uploads so an expired Editor token cannot break the overview.
 */
function canReadDrafts() {
  return Boolean(getSanityReadToken());
}

/** Fetch published + optional draft with the sections we may edit. */
async function fetchRawDocuments(page: SitePage) {
  const draft = draftId(page.id);
  const publishedDocs = z
    .array(z.record(z.string(), z.unknown()))
    .parse(
      await siteQuery(
        `*[_id in $ids]${editorProjection}`,
        { ids: [page.id] },
        { perspective: "published" },
      ),
    );
  const published = publishedDocs.find((doc) => doc._id === page.id);
  if (!canReadDrafts()) return { draft: undefined, published };
  try {
    const draftDocs = z
      .array(z.record(z.string(), z.unknown()))
      .parse(
        await siteQuery(
          `*[_id in $ids]${editorProjection}`,
          { ids: [draft] },
          { perspective: "previewDrafts" },
        ),
      );
    return {
      draft: draftDocs.find((doc) => doc._id === draft),
      published,
    };
  } catch {
    // Invalid/missing draft access must not hide published pages.
    return { draft: undefined, published };
  }
}

/** Raw published document without asset dereferencing — safe to copy into a draft. */
async function fetchPublishedForDraft(page: SitePage) {
  const doc = await siteQuery(`*[_id == $id][0]`, { id: page.id });
  return doc && typeof doc === "object"
    ? (doc as Record<string, unknown>)
    : null;
}

async function loadDocument(page: SitePage) {
  const { draft, published } = await fetchRawDocuments(page);
  const active = draft || published;
  if (!active) {
    return {
      exists: false as const,
      hasDraft: false,
      revision: "",
      updatedAt: null as string | null,
      values: emptyValues(page),
      source: "missing" as const,
    };
  }
  const values = emptyValues(page);
  for (const field of page.fields)
    values[field.key] = extractFieldValue(active, field);
  return {
    exists: true as const,
    hasDraft: Boolean(draft),
    revision: String(active._rev || ""),
    updatedAt: typeof active._updatedAt === "string" ? active._updatedAt : null,
    values,
    source: draft ? ("draft" as const) : ("published" as const),
  };
}

function patchSetFromValues(
  page: SitePage,
  values: Record<string, unknown>,
): Record<string, unknown> {
  const set: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    const field = page.fields.find((item) => item.key === key);
    if (!field) continue;
    if (field.kind === "localizedString" || field.kind === "localizedText") {
      const localized = value as { de?: string; en?: string };
      if (localized.de !== undefined) set[`${field.path}.de`] = localized.de;
      if (localized.en !== undefined) set[`${field.path}.en`] = localized.en;
    } else {
      set[field.path] = value;
    }
  }
  return set;
}

/** Ensure a draft exists by copying the published document once. */
async function ensureDraft(page: SitePage) {
  const { draft } = await fetchRawDocuments(page);
  if (draft) return draft;
  const published = await fetchPublishedForDraft(page);
  if (!published)
    throw new PolicyError(
      "Seite fehlt in Sanity. Bitte zuerst im Sanity Studio anlegen.",
      404,
    );
  const copy: Record<string, unknown> = { ...published, _id: draftId(page.id) };
  delete copy._rev;
  await siteMutate([{ createIfNotExists: copy }]);
  const refreshed = await fetchRawDocuments(page);
  if (!refreshed.draft)
    throw new PolicyError("Entwurf konnte nicht angelegt werden.", 502);
  return refreshed.draft;
}

export async function siteCmsOverview(actor: string) {
  await hubActor(db, actor);
  const pages = [];
  for (const page of sitePages) {
    const loaded = await loadDocument(page);
    pages.push({
      key: page.key,
      title: page.title,
      path: page.path,
      type: page.type,
      exists: loaded.exists,
      hasDraft: loaded.hasDraft,
      source: loaded.source,
      updatedAt: loaded.updatedAt,
      revision: loaded.revision,
      stagingUrl: `${siteCmsStagingUrl}${page.path}`,
      liveUrl: `${siteCmsLiveUrl}${page.path}`,
      studioUrl: `${siteCmsStudioUrl}/${page.type};${page.id}`,
    });
  }
  return {
    studioUrl: siteCmsStudioUrl,
    stagingUrl: siteCmsStagingUrl,
    liveUrl: siteCmsLiveUrl,
    publishAllowed: siteCmsPublishAllowed(page.key),
    writeConfigured: Boolean(getSanityWriteToken()),
    pages,
  };
}

export async function siteCmsPage(actor: string, pageKey: string) {
  await hubActor(db, actor);
  const page = findSitePage(pageKey);
  if (!page) throw new PolicyError("Seite nicht gefunden.", 404);
  const loaded = await loadDocument(page);
  return {
    key: page.key,
    title: page.title,
    path: page.path,
    type: page.type,
    fields: page.fields.map((field) => ({
      key: field.key,
      label: field.label,
      kind: field.kind,
      group: field.group,
      max: field.max,
    })),
    ...loaded,
    stagingUrl: `${siteCmsStagingUrl}${page.path}`,
    liveUrl: `${siteCmsLiveUrl}${page.path}`,
    studioUrl: `${siteCmsStudioUrl}/${page.type};${page.id}`,
    publishAllowed: siteCmsPublishAllowed(page.key),
    writeConfigured: Boolean(getSanityWriteToken()),
  };
}

export async function siteCmsSaveDraft(actor: string, raw: unknown) {
  const input = siteSaveInput.parse(raw);
  const page = findSitePage(input.pageKey)!;
  const values = validatedFieldValues(input.pageKey, input.values);
  await hubActor(db, actor);
  const current = await loadDocument(page);
  if (!current.exists)
    throw new PolicyError(
      "Seite fehlt in Sanity. Bitte zuerst im Sanity Studio anlegen.",
      404,
    );
  if (current.revision !== input.revision)
    throw new PolicyError(
      "Die Seite wurde inzwischen geändert. Bitte neu laden.",
      409,
    );
  await ensureDraft(page);
  const set = patchSetFromValues(page, values);
  if (!Object.keys(set).length)
    throw new PolicyError("Keine gültigen Felder zum Speichern.");
  await siteMutate([{ patch: { id: draftId(page.id), set } }]);
  const saved = await loadDocument(page);
  await db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await audit(tx, actor, "SITE_CMS_DRAFT_SAVED", page.id, {
      pageKey: page.key,
      revision: saved.revision,
      fields: Object.keys(values),
    });
  });
  return {
    saved: true as const,
    revision: saved.revision,
    hasDraft: saved.hasDraft,
    source: saved.source,
    values: saved.values,
  };
}

export async function siteCmsRequestReview(actor: string, raw: unknown) {
  const input = z
    .object({
      pageKey: siteSaveInput.shape.pageKey,
      revision: z.string().min(1).max(200),
      note: z.string().max(500).optional(),
    })
    .strict()
    .parse(raw);
  const page = findSitePage(input.pageKey)!;
  await hubActor(db, actor);
  const current = await loadDocument(page);
  if (!current.hasDraft)
    throw new PolicyError(
      "Kein Entwurf vorhanden. Zuerst speichern, dann zur Freigabe geben.",
    );
  if (current.revision !== input.revision)
    throw new PolicyError(
      "Die Seite wurde inzwischen geändert. Bitte neu laden.",
      409,
    );
  await db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await audit(tx, actor, "SITE_CMS_REVIEW_REQUESTED", page.id, {
      pageKey: page.key,
      revision: input.revision,
      note: input.note || "",
    });
  });
  return { requested: true as const };
}

export async function siteCmsPublish(actor: string, raw: unknown) {
  const input = sitePublishInput.parse(raw);
  if (!siteCmsPublishAllowed(input.pageKey))
    throw new PolicyError(
      "Veröffentlichung für diese Seite ist deaktiviert. Content-Abo benötigt SITE_CMS_ABO_ALLOW_PUBLISH=true.",
      403,
    );
  const page = findSitePage(input.pageKey)!;
  await hubActor(db, actor);
  const current = await loadDocument(page);
  if (!current.hasDraft)
    throw new PolicyError("Kein Entwurf zum Veröffentlichen vorhanden.");
  if (current.revision !== input.revision)
    throw new PolicyError(
      "Die Seite wurde inzwischen geändert. Bitte neu laden.",
      409,
    );
  const review = await db.audit.findFirst({
    where: {
      action: "SITE_CMS_REVIEW_REQUESTED",
      entityId: page.id,
    },
    orderBy: { createdAt: "desc" },
  });
  const detail =
    review?.detail && typeof review.detail === "object"
      ? (review.detail as { revision?: string })
      : {};
  if (!review || detail.revision !== input.revision)
    throw new PolicyError(
      "Freigabe fehlt. Zuerst «Zur Freigabe» setzen, dann ausdrücklich veröffentlichen.",
      403,
    );
  await sitePublishAction(page.id, draftId(page.id));
  const published = await loadDocument(page);
  await db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await audit(tx, actor, "SITE_CMS_PUBLISHED", page.id, {
      pageKey: page.key,
      revision: published.revision,
      stagingUrl: `${siteCmsStagingUrl}${page.path}`,
    });
  });
  return {
    published: true as const,
    revision: published.revision,
    hasDraft: published.hasDraft,
    stagingUrl: `${siteCmsStagingUrl}${page.path}`,
    notice:
      "In Sanity veröffentlicht. Staging zeigt den Stand nach dem nächsten Staging-Build. Produktion bleibt davon getrennt.",
  };
}

export async function siteCmsReplaceMedia(actor: string, raw: unknown) {
  const input = siteMediaInput.parse(raw);
  const page = findSitePage(input.pageKey)!;
  const field = fieldByKey(input.pageKey, input.fieldKey);
  if (!field || (field.kind !== "image" && field.kind !== "mediaImage"))
    throw new PolicyError("Dieses Feld erlaubt keinen Bildersatz.");
  await hubActor(db, actor);
  const current = await loadDocument(page);
  if (!current.exists) throw new PolicyError("Seite fehlt in Sanity.", 404);
  if (current.revision !== input.revision)
    throw new PolicyError(
      "Die Seite wurde inzwischen geändert. Bitte neu laden.",
      409,
    );
  let bytes: Buffer;
  try {
    bytes = Buffer.from(input.data, "base64");
  } catch {
    throw new PolicyError("Ungültige Bilddaten.");
  }
  if (!bytes.byteLength) throw new PolicyError("Leere Bilddatei.");
  const uploaded = await siteUploadImage(
    bytes,
    input.filename,
    input.contentType,
  );
  await ensureDraft(page);
  const imageValue = {
    _type: "image",
    asset: { _type: "reference", _ref: uploaded.assetId },
    ...(input.alt ? { alt: input.alt } : {}),
  };
  const set =
    field.kind === "mediaImage"
      ? {
          [`${field.path}.mediaType`]: "image",
          [`${field.path}.image`]: imageValue,
        }
      : { [field.path]: imageValue };
  await siteMutate([{ patch: { id: draftId(page.id), set } }]);
  const saved = await loadDocument(page);
  await db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await audit(tx, actor, "SITE_CMS_MEDIA_REPLACED", page.id, {
      pageKey: page.key,
      fieldKey: field.key,
      assetId: uploaded.assetId,
      revision: saved.revision,
    });
  });
  return {
    saved: true as const,
    revision: saved.revision,
    hasDraft: saved.hasDraft,
    values: saved.values,
    previewUrl: uploaded.url,
  };
}
