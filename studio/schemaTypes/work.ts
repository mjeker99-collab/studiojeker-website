import { defineField, defineType } from "sanity";

/**
 * Work page — singleton editorial content for /work and /en/work.
 * Four category grids with individually editable image / video / slideshow tiles.
 * Design stays in Next.js.
 */
export const work = defineType({
  name: "work",
  title: "Work",
  type: "document",
  groups: [
    { name: "hero", title: "Hero", default: true },
    { name: "categories", title: "Categories & Tiles" },
    { name: "cta", title: "Final CTA" },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({
      name: "heroSection",
      title: "Hero",
      type: "object",
      group: "hero",
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({
          name: "label",
          title: "Hero Label",
          type: "localizedString",
          description: "Small label above the headline (e.g. Work).",
        }),
        defineField({
          name: "headline",
          title: "Hero Headline",
          type: "localizedString",
        }),
        defineField({
          name: "text",
          title: "Hero Intro Text",
          type: "localizedText",
        }),
      ],
    }),

    defineField({
      name: "categories",
      title: "Work Categories",
      type: "array",
      group: "categories",
      description:
        "Four service-area sections. Each contains individually editable Work tiles.",
      of: [{ type: "workCategory" }],
      validation: (Rule) => Rule.max(4),
    }),

    defineField({
      name: "finalCtaSection",
      title: "Final CTA",
      type: "object",
      group: "cta",
      options: { collapsible: true },
      fields: [
        defineField({
          name: "headlineBefore",
          title: "Headline (before accent)",
          type: "localizedString",
        }),
        defineField({
          name: "headlineAccent",
          title: "Headline Accent",
          type: "localizedString",
          description: 'Accent word styled in cyan, e.g. "Sichtbarkeit".',
        }),
        defineField({
          name: "headlineAfter",
          title: "Headline (after accent)",
          type: "localizedString",
        }),
        defineField({
          name: "text",
          title: "Final CTA Description",
          type: "localizedText",
        }),
        defineField({
          name: "ctaLabel",
          title: "Final CTA Button Label",
          type: "localizedString",
        }),
        defineField({
          name: "ctaHref",
          title: "Final CTA Link",
          type: "string",
          description: "Internal path without locale prefix (e.g. /contact).",
        }),
      ],
    }),

    defineField({
      name: "seoSection",
      title: "SEO",
      type: "object",
      group: "seo",
      options: { collapsible: true },
      fields: [
        defineField({
          name: "title",
          title: "SEO Title",
          type: "localizedString",
        }),
        defineField({
          name: "description",
          title: "Meta Description",
          type: "localizedText",
        }),
        defineField({
          name: "ogImage",
          title: "Social Sharing Image",
          type: "image",
          options: { hotspot: true },
          description: "Optional Open Graph image. Recommended 1200 × 630 px.",
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: "heroSection.headline.de",
      titleEn: "heroSection.headline.en",
    },
    prepare({ title, titleEn }) {
      return {
        title: "Work",
        subtitle: title || titleEn || "Work page",
      };
    },
  },
});
