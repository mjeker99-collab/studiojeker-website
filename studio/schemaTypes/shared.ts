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

/** Reusable editorial text color — brand presets or validated custom HEX. */
export const editorialColor = defineType({
  name: "editorialColor",
  title: "Text Color",
  type: "object",
  fields: [
    defineField({
      name: "preset",
      title: "Color",
      type: "string",
      options: {
        list: [
          { title: "Default (website standard)", value: "" },
          { title: "Black", value: "black" },
          { title: "Cyan", value: "cyan" },
          { title: "White", value: "white" },
          { title: "Custom", value: "custom" },
        ],
        layout: "radio",
      },
      description:
        "Leave on Default to keep the current website color. Choose Cyan for the Studiojeker brand accent.",
    }),
    defineField({
      name: "customHex",
      title: "Custom HEX Color",
      type: "string",
      description: "Enter a valid HEX value such as #000000, #00C8FF or #FFFFFF.",
      hidden: ({ parent }) => parent?.preset !== "custom",
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as { preset?: string } | undefined;
          if (parent?.preset !== "custom") {
            return true;
          }
          if (typeof value !== "string" || !value.trim()) {
            return "Enter a HEX color when Custom is selected.";
          }
          if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value.trim())) {
            return "Use a valid HEX value such as #000000 or #00C8FF.";
          }
          return true;
        }),
    }),
  ],
  preview: {
    select: { preset: "preset", customHex: "customHex" },
    prepare({ preset, customHex }) {
      if (!preset) {
        return { title: "Default (website standard)" };
      }
      if (preset === "custom") {
        return {
          title: "Custom",
          subtitle: typeof customHex === "string" ? customHex : "Add HEX value",
        };
      }
      return { title: String(preset).charAt(0).toUpperCase() + String(preset).slice(1) };
    },
  },
});

/** Convenience wrapper for headline/subheadline color fields in section schemas. */
export function editorialColorField(
  name: string,
  title: string,
  description: string,
) {
  return defineField({
    name,
    title,
    type: "editorialColor",
    description,
  });
}

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
      title: "CTA Label",
      type: "localizedString",
      description: "Button text in German and English.",
    }),
    defineField({
      name: "href",
      title: "CTA Link",
      type: "string",
      description:
        "Internal path without language prefix (e.g. /contact, /work) or full http(s) URL.",
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
      description: "Choose whether this block shows a still image or a Vimeo video.",
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
          title: "Image Alt Text",
          type: "string",
          description: "Describe the image for accessibility and SEO.",
        }),
      ],
    }),
    defineField({
      name: "vimeoUrl",
      title: "Vimeo Video",
      type: "string",
      description:
        "Paste a full Vimeo URL (https://vimeo.com/…) or the numeric video ID.",
      hidden: ({ parent }) => (parent?.mediaType || "image") !== "video",
    }),
    defineField({
      name: "poster",
      title: "Video Poster Image",
      type: "image",
      options: { hotspot: true },
      description: "Still image shown before the video plays.",
      hidden: ({ parent }) => (parent?.mediaType || "image") !== "video",
      fields: [
        defineField({
          name: "alt",
          title: "Poster Alt Text",
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

/**
 * Work tile media — image, Vimeo video, or in-tile slideshow.
 * Matches ProjectMediaCard types without changing frontend layout.
 */
export const workMediaField = defineType({
  name: "workMediaField",
  title: "Tile Media",
  type: "object",
  fields: [
    defineField({
      name: "mediaType",
      title: "Media Type",
      type: "string",
      options: {
        list: [
          { title: "Image", value: "image" },
          { title: "Video (Vimeo or URL)", value: "video" },
          { title: "Slideshow", value: "slideshow" },
        ],
        layout: "radio",
      },
      initialValue: "image",
      description: "Choose how this Work tile displays media.",
    }),
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: { hotspot: true },
      hidden: ({ parent }) => (parent?.mediaType || "image") !== "image",
      fields: [
        defineField({
          name: "alt",
          title: "Alt Text",
          type: "string",
          description: "Describe the image for accessibility and SEO.",
        }),
      ],
    }),
    defineField({
      name: "vimeoUrl",
      title: "Vimeo Video",
      type: "string",
      description:
        "Paste a full Vimeo URL (https://vimeo.com/…) or the numeric video ID.",
      hidden: ({ parent }) => (parent?.mediaType || "image") !== "video",
    }),
    defineField({
      name: "externalVideoUrl",
      title: "External Video URL (optional)",
      type: "url",
      description:
        "Optional direct MP4 or external video URL when not using Vimeo.",
      hidden: ({ parent }) => (parent?.mediaType || "image") !== "video",
      validation: (Rule) =>
        Rule.uri({ scheme: ["http", "https"], allowRelative: false }),
    }),
    defineField({
      name: "poster",
      title: "Video Poster Image",
      type: "image",
      options: { hotspot: true },
      description: "Still image shown before the video plays.",
      hidden: ({ parent }) => (parent?.mediaType || "image") !== "video",
      fields: [
        defineField({
          name: "alt",
          title: "Poster Alt Text",
          type: "string",
        }),
      ],
    }),
    defineField({
      name: "videoAlt",
      title: "Video Description",
      type: "string",
      description: "Accessible label for the video tile.",
      hidden: ({ parent }) => (parent?.mediaType || "image") !== "video",
    }),
    defineField({
      name: "duration",
      title: "Duration Label (optional)",
      type: "string",
      description: 'Optional on-tile duration label, e.g. "0:45".',
      hidden: ({ parent }) => (parent?.mediaType || "image") !== "video",
      validation: (Rule) => Rule.max(20),
    }),
    defineField({
      name: "slideshowImages",
      title: "Slideshow Images",
      type: "array",
      hidden: ({ parent }) => (parent?.mediaType || "image") !== "slideshow",
      of: [
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            defineField({
              name: "alt",
              title: "Alt Text",
              type: "string",
            }),
          ],
        },
      ],
      validation: (Rule) => Rule.max(8),
    }),
    defineField({
      name: "slideshowAlt",
      title: "Slideshow Label",
      type: "string",
      description: "Shared accessible label for the slideshow tile.",
      hidden: ({ parent }) => (parent?.mediaType || "image") !== "slideshow",
    }),
    defineField({
      name: "slideshowInterval",
      title: "Slideshow Interval (ms)",
      type: "number",
      description: "Auto-advance interval. Default on the website is 4500 ms.",
      hidden: ({ parent }) => (parent?.mediaType || "image") !== "slideshow",
      validation: (Rule) => Rule.integer().min(1000).max(30000),
    }),
    defineField({
      name: "gallery",
      title: "Additional Media (optional)",
      type: "array",
      description:
        "Optional extra media for future use. The Work tile still shows one primary media block.",
      of: [{ type: "workMediaField" }],
    }),
  ],
  preview: {
    select: {
      mediaType: "mediaType",
      vimeoUrl: "vimeoUrl",
    },
    prepare({ mediaType, vimeoUrl }) {
      const type = mediaType || "image";
      if (type === "video") {
        return {
          title: "Video",
          subtitle:
            typeof vimeoUrl === "string" && vimeoUrl ? vimeoUrl : "Add Vimeo URL",
        };
      }
      if (type === "slideshow") {
        return { title: "Slideshow", subtitle: "Multiple images" };
      }
      return { title: "Image", subtitle: "Edit image below" };
    },
  },
});

/** Single Work / portfolio tile within a category grid. */
export const workProjectItem = defineType({
  name: "workProjectItem",
  title: "Work Tile",
  type: "object",
  fields: [
    defineField({
      name: "itemId",
      title: "Item ID",
      type: "string",
      description: "Stable id used by the website. Do not change after publish.",
      validation: (Rule) => Rule.required().max(60),
    }),
    defineField({
      name: "title",
      title: "Accessible Title",
      type: "localizedString",
      description:
        "Screen-reader label for the tile. Usually matches the service category name.",
    }),
    defineField({
      name: "subtitle",
      title: "Subtitle (optional)",
      type: "localizedString",
    }),
    defineField({
      name: "description",
      title: "Description (optional)",
      type: "localizedText",
    }),
    defineField({
      name: "client",
      title: "Client (optional)",
      type: "string",
      validation: (Rule) => Rule.max(120),
    }),
    defineField({
      name: "year",
      title: "Year (optional)",
      type: "string",
      validation: (Rule) => Rule.max(10),
    }),
    defineField({
      name: "href",
      title: "Link (optional)",
      type: "string",
      description: "Optional internal path or URL. Work tiles do not navigate by default.",
      validation: (Rule) => Rule.custom((value) => validateOptionalLink(value)),
    }),
    defineField({
      name: "media",
      title: "Tile Media",
      type: "workMediaField",
      validation: (Rule) => Rule.required(),
    }),
    sortOrderField(),
  ],
  preview: {
    select: {
      titleDe: "title.de",
      titleEn: "title.en",
      itemId: "itemId",
      mediaType: "media.mediaType",
    },
    prepare({ titleDe, titleEn, itemId, mediaType }) {
      return {
        title: titleDe || titleEn || itemId || "Work tile",
        subtitle: [itemId, mediaType || "image"].filter(Boolean).join(" · "),
      };
    },
  },
});

/** Work page category — one of the four Studiojeker service areas. */
export const workCategory = defineType({
  name: "workCategory",
  title: "Work Category",
  type: "object",
  fields: [
    defineField({
      name: "categoryId",
      title: "Category ID",
      type: "string",
      options: {
        list: [
          { title: "Digital / Social Media Marketing", value: "digital" },
          { title: "Business Communication", value: "business" },
          { title: "Product Communication", value: "product" },
          { title: "Architecture & Real Estate", value: "architecture" },
        ],
        layout: "dropdown",
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "title",
      title: "Category Title",
      type: "localizedString",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "items",
      title: "Work Tiles",
      type: "array",
      of: [{ type: "workProjectItem" }],
      validation: (Rule) => Rule.max(8),
    }),
    sortOrderField(),
  ],
  preview: {
    select: {
      titleDe: "title.de",
      categoryId: "categoryId",
      count: "items.length",
    },
    prepare({ titleDe, categoryId, count }) {
      return {
        title: titleDe || categoryId || "Category",
        subtitle: `${count ?? 0} tile(s)`,
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

/** @deprecated Prefer Homepage → Services references to Service documents. Kept for legacy flat fields. */
export const homepageServiceItem = defineType({
  name: "homepageServiceItem",
  title: "Service Area (legacy)",
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
        "Optional. Homepage service cards use fixed icons in the current design.",
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
