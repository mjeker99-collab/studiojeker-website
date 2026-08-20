import { defineField, defineType } from "sanity";

/** Shared SEO fields — content only, no design controls. */
export const seoFields = [
  defineField({
    name: "seoTitle",
    title: "SEO Title",
    type: "string",
    description: "Search result title. Keep under ~60 characters.",
    validation: (Rule) => Rule.max(70).warning("Prefer 60 characters or fewer."),
  }),
  defineField({
    name: "seoDescription",
    title: "SEO Description",
    type: "text",
    rows: 3,
    description: "Search result description. Keep under ~160 characters.",
    validation: (Rule) =>
      Rule.max(180).warning("Prefer 160 characters or fewer."),
  }),
];

export const urlField = (
  name: string,
  title: string,
  options?: { required?: boolean; description?: string },
) =>
  defineField({
    name,
    title,
    type: "url",
    description: options?.description,
    validation: (Rule) => {
      const base = Rule.uri({
        scheme: ["http", "https"],
        allowRelative: false,
      });
      return options?.required ? base.required() : base;
    },
  });

export const sortOrderField = (group?: string) =>
  defineField({
    name: "sortOrder",
    title: "Sort Order",
    type: "number",
    group,
    description: "Lower numbers appear first. Leave empty to use default order.",
    validation: (Rule) => Rule.integer().min(0),
  });

/** Bilingual string for DE/EN homepage content. */
export const localizedString = defineType({
  name: "localizedString",
  title: "Localized String",
  type: "object",
  fields: [
    defineField({
      name: "de",
      title: "German",
      type: "string",
    }),
    defineField({
      name: "en",
      title: "English",
      type: "string",
    }),
  ],
});

/** Bilingual longer text for DE/EN homepage content. */
export const localizedText = defineType({
  name: "localizedText",
  title: "Localized Text",
  type: "object",
  fields: [
    defineField({
      name: "de",
      title: "German",
      type: "text",
      rows: 4,
    }),
    defineField({
      name: "en",
      title: "English",
      type: "text",
      rows: 4,
    }),
  ],
});

/** Accept empty values, internal paths (/…), or absolute http(s) URLs. */
function validateOptionalLink(value: unknown): true | string {
  if (value === undefined || value === null || value === "") {
    return true;
  }
  if (typeof value !== "string") {
    return "Use an internal path (/…) or an http(s) URL";
  }
  if (value.startsWith("/")) {
    return true;
  }
  if (/^https?:\/\//i.test(value)) {
    return true;
  }
  return "Use an internal path (/…) or an http(s) URL";
}

/** Bilingual CTA button label + shared link target. */
export const ctaField = defineType({
  name: "ctaField",
  title: "Call to Action",
  type: "object",
  fields: [
    defineField({
      name: "label",
      title: "Button Label",
      type: "localizedString",
      description: "Button text in German and English.",
    }),
    defineField({
      name: "href",
      title: "Link",
      type: "string",
      description:
        "Internal path without locale prefix (e.g. /contact, /work) or absolute http(s) URL.",
      validation: (Rule) => Rule.custom((value) => validateOptionalLink(value)),
    }),
  ],
});

/**
 * Reusable image or Vimeo video block.
 * Layout and presentation remain controlled by the website.
 * Studio preview is text-only to avoid asset Load failed errors.
 */
export const mediaField = defineType({
  name: "mediaField",
  title: "Media",
  type: "object",
  fields: [
    defineField({
      name: "mediaType",
      title: "Media Type",
      type: "string",
      options: {
        list: [
          { title: "Image", value: "image" },
          { title: "Video (Vimeo)", value: "video" },
        ],
        layout: "radio",
      },
      initialValue: "image",
    }),
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: { hotspot: true },
      // Default to image when mediaType is unset — keeps the upload visible.
      hidden: ({ parent }) => (parent?.mediaType || "image") === "video",
      fields: [
        defineField({
          name: "alt",
          title: "Alt Text",
          type: "string",
          description: "Describe the image for accessibility.",
        }),
      ],
    }),
    defineField({
      name: "vimeoUrl",
      title: "Vimeo URL or ID",
      type: "string",
      description: "Full Vimeo URL or numeric video ID. No external fetch in Studio.",
      hidden: ({ parent }) => (parent?.mediaType || "image") !== "video",
    }),
    defineField({
      name: "poster",
      title: "Poster / Fallback Image",
      type: "image",
      options: { hotspot: true },
      description: "Shown before the video plays.",
      hidden: ({ parent }) => (parent?.mediaType || "image") !== "video",
      fields: [
        defineField({
          name: "alt",
          title: "Alt Text",
          type: "string",
        }),
      ],
    }),
    defineField({
      name: "mobilePoster",
      title: "Mobile Poster (optional)",
      type: "image",
      options: { hotspot: true },
      description: "Optional alternative poster for smaller screens.",
      hidden: ({ parent }) => (parent?.mediaType || "image") !== "video",
    }),
  ],
  preview: {
    select: {
      mediaType: "mediaType",
      vimeoUrl: "vimeoUrl",
    },
    prepare({ mediaType, vimeoUrl }) {
      const isVideo = (mediaType || "image") === "video";
      return {
        title: isVideo ? "Video (Vimeo)" : "Image",
        subtitle: isVideo
          ? typeof vimeoUrl === "string" && vimeoUrl
            ? vimeoUrl
            : "Add a Vimeo URL or ID"
          : "Edit image fields below",
      };
    },
  },
});

/** Benefit item for the Sichtbarkeit im Abo section. */
export const homepageBenefitItem = defineType({
  name: "homepageBenefitItem",
  title: "Benefit",
  type: "object",
  fields: [
    defineField({
      name: "id",
      title: "Icon Key",
      type: "string",
      description:
        "Internal key for the benefit icon (continuous, system, visibility, planning).",
      options: {
        list: [
          { title: "Continuous content", value: "continuous" },
          { title: "One system", value: "system" },
          { title: "More visibility", value: "visibility" },
          { title: "Predictable costs", value: "planning" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "localizedString",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "localizedText",
    }),
    sortOrderField(),
  ],
  preview: {
    select: {
      titleDe: "title.de",
      titleEn: "title.en",
      id: "id",
    },
    prepare({ titleDe, titleEn, id }) {
      return {
        title: titleDe || titleEn || "Benefit",
        subtitle: id,
      };
    },
  },
});

/** Homepage service card — maps to the four service areas. */
export const homepageServiceItem = defineType({
  name: "homepageServiceItem",
  title: "Service Area",
  type: "object",
  fields: [
    defineField({
      name: "serviceId",
      title: "Service",
      type: "string",
      options: {
        list: [
          { title: "Digital & Social Media Marketing", value: "digital" },
          { title: "Business Communication", value: "business" },
          { title: "Product Communication", value: "product" },
          { title: "Architecture & Real Estate", value: "architecture" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "localizedString",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Short Description",
      type: "localizedText",
    }),
    defineField({
      name: "href",
      title: "Link",
      type: "string",
      description: "Internal path without locale prefix (e.g. /services/digital-marketing) or http(s) URL.",
      validation: (Rule) => Rule.custom((value) => validateOptionalLink(value)),
    }),
    defineField({
      name: "ctaLabel",
      title: "CTA Label (optional)",
      type: "localizedString",
    }),
    defineField({
      name: "media",
      title: "Image or Video (optional)",
      type: "mediaField",
      description:
        "Optional media asset. The homepage currently uses service icons — this field is stored for future use.",
    }),
    sortOrderField(),
  ],
  preview: {
    select: {
      titleDe: "title.de",
      serviceId: "serviceId",
    },
    prepare({ titleDe, serviceId }) {
      return {
        title: titleDe || "Service area",
        subtitle: serviceId,
      };
    },
  },
});
