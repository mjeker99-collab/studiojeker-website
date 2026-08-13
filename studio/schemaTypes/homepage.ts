import { defineField, defineType } from "sanity";
import { seoFields } from "./shared";

/**
 * Homepage — singleton editorial content.
 * Preserves existing test fields: heroHeadline, introText, heroImage.
 * Not connected to the Next.js marketing homepage yet.
 */
export const homepage = defineType({
  name: "homepage",
  title: "Homepage",
  type: "document",
  groups: [
    { name: "hero", title: "Hero", default: true },
    { name: "intro", title: "Introduction" },
    { name: "services", title: "Services section" },
    { name: "work", title: "Work section" },
    { name: "cta", title: "Final CTA" },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    // --- Preserved test fields (do not rename) ---
    defineField({
      name: "heroHeadline",
      title: "Hero Headline",
      type: "string",
      group: "hero",
      description: "Main hero headline on the homepage.",
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      name: "introText",
      title: "Intro Text",
      type: "text",
      rows: 4,
      group: "hero",
      description:
        "Hero supporting text (existing test field — keep for compatibility).",
      validation: (Rule) => Rule.max(600),
    }),
    defineField({
      name: "heroImage",
      title: "Hero Image",
      type: "image",
      group: "hero",
      options: { hotspot: true },
      description: "Primary hero image. Crop/hotspot for responsive framing.",
    }),
    defineField({
      name: "heroVideoUrl",
      title: "Hero Video URL (optional)",
      type: "url",
      group: "hero",
      description: "Optional Vimeo URL if the hero uses video instead of/ besides image.",
      validation: (Rule) =>
        Rule.uri({ scheme: ["http", "https"], allowRelative: false }),
    }),

    // --- Introduction ---
    defineField({
      name: "mainIntroHeadline",
      title: "Main Introductory Headline",
      type: "string",
      group: "intro",
      validation: (Rule) => Rule.max(160),
    }),
    defineField({
      name: "mainIntroText",
      title: "Main Introductory Text",
      type: "text",
      rows: 5,
      group: "intro",
      validation: (Rule) => Rule.max(1200),
    }),

    // --- Services teaser ---
    defineField({
      name: "servicesSectionHeadline",
      title: "Services Section Headline",
      type: "string",
      group: "services",
      validation: (Rule) => Rule.max(120),
    }),
    defineField({
      name: "servicesIntro",
      title: "Services Intro",
      type: "text",
      rows: 3,
      group: "services",
      validation: (Rule) => Rule.max(600),
    }),

    // --- Work teaser ---
    defineField({
      name: "workSectionHeadline",
      title: "Work Section Headline",
      type: "string",
      group: "work",
      validation: (Rule) => Rule.max(120),
    }),
    defineField({
      name: "workIntro",
      title: "Work Intro",
      type: "text",
      rows: 3,
      group: "work",
      validation: (Rule) => Rule.max(600),
    }),

    // --- Final CTA ---
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
      description: "Button label only — link target is defined in the website.",
      validation: (Rule) => Rule.max(60),
    }),

    ...seoFields.map((field) => ({ ...field, group: "seo" })),
  ],
  preview: {
    select: {
      title: "heroHeadline",
      media: "heroImage",
    },
    prepare({ title, media }) {
      return {
        title: title || "Homepage",
        subtitle: "Singleton page content",
        media,
      };
    },
  },
});
