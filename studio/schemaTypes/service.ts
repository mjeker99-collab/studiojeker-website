import { defineField, defineType } from "sanity";
import { seoFields, sortOrderField } from "./shared";

const imageAltField = defineField({
  name: "alt",
  title: "Alt Text",
  type: "string",
  description: "Describe the image for accessibility.",
});

const SERVICE_SLUGS = [
  "digital-marketing",
  "business-communication",
  "product-communication",
  "architecture",
] as const;

const SOLUTION_ICONS = [
  { title: "Film", value: "film" },
  { title: "Portrait", value: "portrait" },
  { title: "Reportage", value: "reportage" },
  { title: "Internal / Social (lines)", value: "internal" },
  { title: "Product photo", value: "product-photo" },
  { title: "Product film", value: "product-film" },
  { title: "3D visualization", value: "viz3d" },
  { title: "Animation", value: "animation" },
  { title: "Architecture", value: "architecture" },
  { title: "Drone", value: "drone" },
  { title: "Virtual tour", value: "tour" },
  { title: "Strategy", value: "strategy" },
  { title: "Social", value: "social" },
  { title: "Content", value: "content" },
  { title: "Visibility subscription", value: "abo" },
] as const;

/**
 * Service page — one document per current service area.
 * Fields match the sections currently rendered on the Next.js service pages.
 * Design stays in Next.js.
 */
export const service = defineType({
  name: "service",
  title: "Service",
  type: "document",
  groups: [
    { name: "basics", title: "Basics", default: true },
    { name: "hero", title: "Hero" },
    { name: "solutions", title: "Solutions" },
    { name: "showreel", title: "Showreel" },
    { name: "projects", title: "Projects" },
    { name: "about", title: "About block" },
    { name: "clients", title: "Clients" },
    { name: "cta", title: "Final CTA" },
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
      name: "displayTitle",
      title: "Public Page Title",
      type: "string",
      group: "basics",
      description: "Public service name (hero label / listings).",
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      group: "basics",
      description:
        "Must match the existing website route. Do not rename — URLs stay unchanged.",
      options: {
        source: "displayTitle",
        maxLength: 96,
      },
      validation: (Rule) =>
        Rule.required().custom((slug) => {
          const value = slug?.current;
          if (!value) return "Slug is required";
          return (SERVICE_SLUGS as readonly string[]).includes(value)
            ? true
            : `Slug must be one of: ${SERVICE_SLUGS.join(", ")}`;
        }),
    }),
    sortOrderField("basics"),

    defineField({
      name: "heroLabel",
      title: "Hero Label",
      type: "string",
      group: "hero",
      description: "Small eyebrow above the headline.",
      validation: (Rule) => Rule.max(80),
    }),
    defineField({
      name: "heroHeadline",
      title: "Hero Headline",
      type: "text",
      rows: 2,
      group: "hero",
      description: "Do not include the trailing accent character (usually “.”).",
      validation: (Rule) => Rule.required().max(200),
    }),
    defineField({
      name: "heroHeadlineAccent",
      title: "Hero Headline Accent",
      type: "string",
      group: "hero",
      description: "Optional cyan accent appended to the headline, e.g. “.”.",
      validation: (Rule) => Rule.max(8),
    }),
    defineField({
      name: "heroSubheadline",
      title: "Hero Subheadline",
      type: "text",
      rows: 2,
      group: "hero",
      validation: (Rule) => Rule.max(300),
    }),
    defineField({
      name: "heroIntroText",
      title: "Hero Intro Text",
      type: "text",
      rows: 6,
      group: "hero",
      description: "Separate paragraphs with a blank line.",
      validation: (Rule) => Rule.max(1500),
    }),
    defineField({
      name: "heroCtaLabel",
      title: "Hero CTA Label",
      type: "string",
      group: "hero",
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: "heroCtaHref",
      title: "Hero CTA Target",
      type: "string",
      group: "hero",
      description: "Existing site path, e.g. /contact.",
      validation: (Rule) => Rule.max(200),
    }),
    defineField({
      name: "heroImage",
      title: "Hero Image",
      type: "image",
      group: "hero",
      options: { hotspot: true },
      fields: [imageAltField],
    }),

    defineField({
      name: "solutionsLabel",
      title: "Solutions Label",
      type: "string",
      group: "solutions",
      validation: (Rule) => Rule.max(80),
    }),
    defineField({
      name: "solutionsHeadline",
      title: "Solutions Headline",
      type: "string",
      group: "solutions",
      description: "Visually hidden heading for the solutions grid.",
      validation: (Rule) => Rule.max(120),
    }),
    defineField({
      name: "solutions",
      title: "Solution Items",
      type: "array",
      group: "solutions",
      of: [
        {
          type: "object",
          name: "serviceSolutionItem",
          title: "Solution",
          fields: [
            defineField({
              name: "itemId",
              title: "Item ID",
              type: "string",
              description: "Stable id used by the website. Do not change.",
              validation: (Rule) => Rule.required().max(60),
            }),
            defineField({
              name: "title",
              title: "Title",
              type: "string",
              validation: (Rule) => Rule.required().max(80),
            }),
            defineField({
              name: "description",
              title: "Description",
              type: "text",
              rows: 3,
              validation: (Rule) => Rule.required().max(400),
            }),
            defineField({
              name: "href",
              title: "Link Target",
              type: "string",
              description: "Existing site path, e.g. /work or /contact.",
              validation: (Rule) => Rule.max(200),
            }),
            defineField({
              name: "icon",
              title: "Icon",
              type: "string",
              options: { list: [...SOLUTION_ICONS], layout: "dropdown" },
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: { title: "title", subtitle: "description" },
          },
        },
      ],
      validation: (Rule) => Rule.max(8),
    }),

    defineField({
      name: "showreelLabel",
      title: "Showreel Label",
      type: "string",
      group: "showreel",
      validation: (Rule) => Rule.max(80),
    }),
    defineField({
      name: "showreelHeadline",
      title: "Showreel Headline",
      type: "string",
      group: "showreel",
      description: "Do not include a trailing period — the website adds it.",
      validation: (Rule) => Rule.max(160),
    }),
    defineField({
      name: "showreelBody",
      title: "Showreel Text",
      type: "text",
      rows: 3,
      group: "showreel",
      validation: (Rule) => Rule.max(600),
    }),
    defineField({
      name: "showreelCtaLabel",
      title: "Showreel CTA Label",
      type: "string",
      group: "showreel",
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: "showreelCtaHref",
      title: "Showreel CTA Target",
      type: "string",
      group: "showreel",
      description: "Existing site path, e.g. /work.",
      validation: (Rule) => Rule.max(200),
    }),
    defineField({
      name: "showreelImage",
      title: "Showreel Poster Image",
      type: "image",
      group: "showreel",
      options: { hotspot: true },
      fields: [imageAltField],
    }),
    defineField({
      name: "showreelVideoId",
      title: "Showreel Vimeo ID or URL",
      type: "string",
      group: "showreel",
      description:
        "Vimeo video ID (digits) or a Vimeo URL. Autoplay/controls stay in the website.",
      validation: (Rule) => Rule.max(200),
    }),

    defineField({
      name: "projectsLabel",
      title: "Projects Label",
      type: "string",
      group: "projects",
      validation: (Rule) => Rule.max(80),
    }),
    defineField({
      name: "projectsHeadline",
      title: "Projects Headline",
      type: "string",
      group: "projects",
      validation: (Rule) => Rule.max(160),
    }),
    defineField({
      name: "projectsViewAllLabel",
      title: "View-all Label",
      type: "string",
      group: "projects",
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: "projectsViewAllHref",
      title: "View-all Target",
      type: "string",
      group: "projects",
      description: "Existing site path, e.g. /work.",
      validation: (Rule) => Rule.max(200),
    }),
    defineField({
      name: "projects",
      title: "Project Tiles",
      type: "array",
      group: "projects",
      of: [
        {
          type: "object",
          name: "serviceProjectItem",
          title: "Project Tile",
          fields: [
            defineField({
              name: "itemId",
              title: "Item ID",
              type: "string",
              description: "Stable id used by the website. Do not change.",
              validation: (Rule) => Rule.required().max(60),
            }),
            defineField({
              name: "title",
              title: "Title",
              type: "string",
              validation: (Rule) => Rule.required().max(120),
            }),
            defineField({
              name: "category",
              title: "Category",
              type: "string",
              validation: (Rule) => Rule.max(80),
            }),
            defineField({
              name: "href",
              title: "Link Target",
              type: "string",
              validation: (Rule) => Rule.max(200),
            }),
            defineField({
              name: "image",
              title: "Image",
              type: "image",
              options: { hotspot: true },
              fields: [imageAltField],
            }),
            defineField({
              name: "isPlaceholder",
              title: "Placeholder Tile",
              type: "boolean",
              description: "Keep true until a real case study exists.",
              initialValue: true,
            }),
          ],
          preview: {
            select: {
              title: "title",
              subtitle: "category",
              media: "image",
            },
          },
        },
      ],
      validation: (Rule) => Rule.max(8),
    }),

    defineField({
      name: "aboutLabel",
      title: "About Label",
      type: "string",
      group: "about",
      validation: (Rule) => Rule.max(80),
    }),
    defineField({
      name: "aboutHeadline",
      title: "About Headline",
      type: "string",
      group: "about",
      description: "Do not include the trailing accent character (usually “.”).",
      validation: (Rule) => Rule.max(160),
    }),
    defineField({
      name: "aboutHeadlineAccent",
      title: "About Headline Accent",
      type: "string",
      group: "about",
      validation: (Rule) => Rule.max(8),
    }),
    defineField({
      name: "aboutSubheadline",
      title: "About Subheadline",
      type: "string",
      group: "about",
      validation: (Rule) => Rule.max(200),
    }),
    defineField({
      name: "aboutText",
      title: "About Text",
      type: "text",
      rows: 4,
      group: "about",
      description: "Separate paragraphs with a blank line.",
      validation: (Rule) => Rule.max(1200),
    }),
    defineField({
      name: "aboutCtaLabel",
      title: "About CTA Label",
      type: "string",
      group: "about",
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: "aboutCtaHref",
      title: "About CTA Target",
      type: "string",
      group: "about",
      description: "Existing site path, e.g. /about.",
      validation: (Rule) => Rule.max(200),
    }),
    defineField({
      name: "aboutImage",
      title: "About Image",
      type: "image",
      group: "about",
      options: { hotspot: true },
      fields: [imageAltField],
    }),

    defineField({
      name: "clientsLabel",
      title: "Clients Label",
      type: "string",
      group: "clients",
      description: "Logo set stays in the website. This field is the heading only.",
      validation: (Rule) => Rule.max(80),
    }),

    defineField({
      name: "ctaHeadline",
      title: "CTA Headline",
      type: "string",
      group: "cta",
      description: "Full headline including the accented word.",
      validation: (Rule) => Rule.max(200),
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
    defineField({
      name: "ctaHref",
      title: "CTA Target",
      type: "string",
      group: "cta",
      description: "Existing site path, e.g. /contact.",
      validation: (Rule) => Rule.max(200),
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
