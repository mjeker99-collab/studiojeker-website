import { defineField, defineType } from "sanity";
import { seoFields, sortOrderField } from "./shared";

/**
 * Service page — reusable document for Studiojeker service areas.
 */
export const service = defineType({
  name: "service",
  title: "Service",
  type: "document",
  groups: [
    { name: "basics", title: "Basics", default: true },
    { name: "hero", title: "Hero" },
    { name: "content", title: "Content" },
    { name: "media", title: "Media" },
    { name: "cta", title: "CTA" },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({
      name: "internalTitle",
      title: "Internal Title",
      type: "string",
      group: "basics",
      description: "Studio-only label for editors.",
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      group: "basics",
      options: {
        source: "displayTitle",
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "displayTitle",
      title: "Navigation / Display Title",
      type: "string",
      group: "basics",
      description: "Shown in navigation and listings.",
      validation: (Rule) => Rule.required().max(120),
    }),
    sortOrderField("basics"),

    defineField({
      name: "homepageTitle",
      title: "Homepage Card Title",
      type: "localizedString",
      group: "basics",
      description:
        "Title shown on the Homepage services grid. Falls back to Navigation / Display Title when empty.",
    }),
    defineField({
      name: "homepageDescription",
      title: "Homepage Card Description",
      type: "localizedText",
      group: "basics",
      description: "Short description shown on the Homepage services grid.",
    }),

    defineField({
      name: "heroHeadline",
      title: "Hero Headline",
      type: "string",
      group: "hero",
      description:
        "Optional. Service page copy currently uses the website fallback unless later wired.",
      validation: (Rule) => Rule.max(160),
    }),
    defineField({
      name: "heroIntro",
      title: "Hero Intro",
      type: "text",
      rows: 4,
      group: "hero",
      description:
        "Optional. Service page copy currently uses the website fallback unless later wired.",
      validation: (Rule) => Rule.max(600),
    }),
    defineField({
      name: "heroImage",
      title: "Hero Image",
      type: "image",
      group: "hero",
      options: { hotspot: true },
      description:
        "Main image in the Service page hero (right side on desktop). Replace and Publish to update staging within seconds.",
      fields: [
        defineField({
          name: "alt",
          title: "Alt Text",
          type: "string",
          description:
            "Describe the image for accessibility and SEO (e.g. Produktfotografie von Studiojeker).",
        }),
      ],
    }),
    defineField({
      name: "heroVideoUrl",
      title: "Hero Video URL (optional)",
      type: "url",
      group: "hero",
      description:
        "Optional Vimeo URL. Kept for future use — the current Service hero shows an image.",
      validation: (Rule) =>
        Rule.uri({ scheme: ["http", "https"], allowRelative: false }),
    }),

    defineField({
      name: "introText",
      title: "Intro Text",
      type: "text",
      rows: 5,
      group: "content",
      validation: (Rule) => Rule.max(1500),
    }),
    defineField({
      name: "contentSections",
      title: "Additional Content Sections",
      type: "array",
      group: "content",
      of: [
        {
          type: "object",
          name: "contentSection",
          title: "Content Section",
          fields: [
            defineField({
              name: "headline",
              title: "Headline",
              type: "string",
              validation: (Rule) => Rule.max(160),
            }),
            defineField({
              name: "text",
              title: "Text",
              type: "text",
              rows: 5,
              validation: (Rule) => Rule.max(2000),
            }),
          ],
          preview: {
            select: { title: "headline" },
            prepare({ title }) {
              return { title: title || "Content section" };
            },
          },
        },
      ],
    }),

    defineField({
      name: "images",
      title: "Images",
      type: "array",
      group: "media",
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
    }),
    defineField({
      name: "videoUrl",
      title: "Video URL",
      type: "url",
      group: "media",
      description: "Primary Vimeo (or other) video URL for this service.",
      validation: (Rule) =>
        Rule.uri({ scheme: ["http", "https"], allowRelative: false }),
    }),

    defineField({
      name: "ctaHeadline",
      title: "CTA Headline",
      type: "string",
      group: "cta",
      validation: (Rule) => Rule.max(160),
    }),
    defineField({
      name: "ctaText",
      title: "CTA Text",
      type: "text",
      rows: 3,
      group: "cta",
      validation: (Rule) => Rule.max(400),
    }),
    defineField({
      name: "ctaLabel",
      title: "CTA Label",
      type: "string",
      group: "cta",
      validation: (Rule) => Rule.max(60),
    }),

    ...seoFields.map((field) => ({ ...field, group: "seo" })),
  ],
  orderings: [
    {
      title: "Sort order",
      name: "sortOrderAsc",
      by: [{ field: "sortOrder", direction: "asc" }],
    },
    {
      title: "Display title",
      name: "displayTitleAsc",
      by: [{ field: "displayTitle", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      title: "displayTitle",
      subtitle: "internalTitle",
      media: "heroImage",
      order: "sortOrder",
    },
    prepare({ title, subtitle, media, order }) {
      return {
        title: title || "Untitled service",
        subtitle: [order != null ? `#${order}` : null, subtitle]
          .filter(Boolean)
          .join(" · "),
        media,
      };
    },
  },
});
