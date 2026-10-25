/**
 * Allowlisted editorial fields for studiojeker.ch singletons.
 * Paths match the existing Sanity schemas in /studio/schemaTypes.
 * Unknown paths are rejected before any write.
 */

export type FieldKind =
  | "string"
  | "text"
  | "localizedString"
  | "localizedText"
  | "image"
  | "mediaImage";

export type EditableField = {
  key: string;
  /** Dot path into the Sanity document (no drafts. prefix). */
  path: string;
  label: string;
  kind: FieldKind;
  group: "content" | "seo" | "media";
  max?: number;
};

export type SitePage = {
  key: string;
  type: string;
  /** Published document id in Sanity. */
  id: string;
  title: string;
  /** Public DE path on the marketing site. */
  path: string;
  fields: EditableField[];
};

const localizedSeo = (prefix: string): EditableField[] => [
  {
    key: "seoTitle",
    path: `${prefix}.title`,
    label: "SEO-Titel",
    kind: "localizedString",
    group: "seo",
    max: 70,
  },
  {
    key: "seoDescription",
    path: `${prefix}.description`,
    label: "Meta-Description",
    kind: "localizedText",
    group: "seo",
    max: 180,
  },
];

const rootSeo: EditableField[] = [
  {
    key: "seoTitle",
    path: "seoTitle",
    label: "SEO-Titel",
    kind: "string",
    group: "seo",
    max: 70,
  },
  {
    key: "seoDescription",
    path: "seoDescription",
    label: "Meta-Description",
    kind: "text",
    group: "seo",
    max: 180,
  },
];

/** Homepage singleton id matches Studio structure (live published document). */
export const HOMEPAGE_ID = "b5bb69d5-b05a-49be-b453-bf9bcd68ecb1";

export const sitePages: SitePage[] = [
  {
    key: "homepage",
    type: "homepage",
    id: HOMEPAGE_ID,
    title: "Homepage",
    path: "/",
    fields: [
      {
        key: "heroHeadline",
        path: "heroSection.headline",
        label: "Hero-Headline",
        kind: "localizedString",
        group: "content",
        max: 120,
      },
      {
        key: "heroSubheadline",
        path: "heroSection.subheadline",
        label: "Hero-Unterzeile",
        kind: "localizedString",
        group: "content",
        max: 200,
      },
      {
        key: "heroIntro",
        path: "heroSection.intro",
        label: "Hero-Text",
        kind: "localizedText",
        group: "content",
        max: 800,
      },
      {
        key: "heroImage",
        path: "heroSection.media",
        label: "Hero-Bild",
        kind: "mediaImage",
        group: "media",
      },
      ...localizedSeo("seoSection"),
    ],
  },
  {
    key: "about",
    type: "about",
    id: "about",
    title: "About",
    path: "/about/",
    fields: [
      {
        key: "heroHeadline",
        path: "heroHeadline",
        label: "Seiten-Headline",
        kind: "text",
        group: "content",
        max: 160,
      },
      {
        key: "heroSubheadline",
        path: "heroSubheadline",
        label: "Hero-Unterzeile",
        kind: "string",
        group: "content",
        max: 200,
      },
      {
        key: "heroIntro",
        path: "heroIntroText",
        label: "Hero-Text",
        kind: "text",
        group: "content",
        max: 1200,
      },
      {
        key: "heroImage",
        path: "heroImage",
        label: "Hero-Bild",
        kind: "image",
        group: "media",
      },
      ...rootSeo,
    ],
  },
  {
    key: "contact",
    type: "contact",
    id: "contact",
    title: "Kontakt",
    path: "/contact/",
    fields: [
      {
        key: "heroHeadline",
        path: "heroSection.headline",
        label: "Hero-Headline",
        kind: "localizedString",
        group: "content",
        max: 160,
      },
      {
        key: "heroSubheadline",
        path: "heroSection.subheadline",
        label: "Hero-Text",
        kind: "localizedText",
        group: "content",
        max: 800,
      },
      {
        key: "heroImage",
        path: "heroSection.media",
        label: "Hero-Bild",
        kind: "mediaImage",
        group: "media",
      },
      ...localizedSeo("seoSection"),
    ],
  },
  {
    key: "work",
    type: "work",
    id: "work",
    title: "Work",
    path: "/work/",
    fields: [
      {
        key: "heroHeadline",
        path: "heroSection.headline",
        label: "Hero-Headline",
        kind: "localizedString",
        group: "content",
        max: 160,
      },
      {
        key: "heroIntro",
        path: "heroSection.text",
        label: "Hero-Text",
        kind: "localizedText",
        group: "content",
        max: 800,
      },
      ...localizedSeo("seoSection"),
    ],
  },
  {
    key: "abo",
    type: "abo",
    id: "abo",
    title: "Content Abo",
    path: "/content-abo/",
    fields: [
      {
        key: "heroHeadline",
        path: "heroSection.headline",
        label: "Hero-Headline",
        kind: "localizedString",
        group: "content",
        max: 160,
      },
      {
        key: "heroIntro",
        path: "heroSection.text",
        label: "Hero-Text",
        kind: "localizedText",
        group: "content",
        max: 800,
      },
      {
        key: "heroImage",
        path: "heroSection.media",
        label: "Hero-Bild",
        kind: "mediaImage",
        group: "media",
      },
      ...localizedSeo("seoSection"),
    ],
  },
  {
    key: "ai",
    type: "ai",
    id: "ai",
    title: "KI / AI",
    path: "/ki/",
    fields: [
      {
        key: "heroHeadline",
        path: "heroSection.headline",
        label: "Hero-Headline",
        kind: "localizedString",
        group: "content",
        max: 160,
      },
      {
        key: "heroIntro",
        path: "heroSection.text",
        label: "Hero-Text",
        kind: "localizedText",
        group: "content",
        max: 800,
      },
      {
        key: "heroImage",
        path: "heroSection.media",
        label: "Hero-Bild",
        kind: "mediaImage",
        group: "media",
      },
      ...localizedSeo("seoSection"),
    ],
  },
];

export function findSitePage(key: string): SitePage | undefined {
  return sitePages.find((page) => page.key === key);
}

export function draftId(publishedId: string): string {
  return publishedId.startsWith("drafts.")
    ? publishedId
    : `drafts.${publishedId}`;
}

export function publishedId(id: string): string {
  return id.startsWith("drafts.") ? id.slice("drafts.".length) : id;
}
