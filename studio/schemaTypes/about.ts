import { defineField, defineType } from "sanity";
import { seoFields } from "./shared";

const imageAltField = defineField({
  name: "alt",
  title: "Alt Text",
  type: "string",
  description: "Describe the image for accessibility.",
});

/**
 * About page — singleton editorial content matching the current /about layout.
 * Content only — design stays in Next.js.
 */
export const about = defineType({
  name: "about",
  title: "About",
  type: "document",
  groups: [
    { name: "hero", title: "Hero", default: true },
    { name: "values", title: "Unser Anspruch" },
    { name: "team", title: "Team" },
    { name: "facts", title: "Facts" },
    { name: "approach", title: "How we work" },
    { name: "services", title: "Services section" },
    { name: "cta", title: "Final CTA" },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({
      name: "heroLabel",
      title: "Hero Label",
      type: "string",
      group: "hero",
      validation: (Rule) => Rule.max(80),
    }),
    defineField({
      name: "heroHeadline",
      title: "Page Headline",
      type: "text",
      rows: 2,
      group: "hero",
      description: "Use a line break to match the two-line About H1.",
      validation: (Rule) => Rule.required().max(160),
    }),
    defineField({
      name: "heroSubheadline",
      title: "Hero Subheadline",
      type: "string",
      group: "hero",
      validation: (Rule) => Rule.max(200),
    }),
    defineField({
      name: "heroIntroText",
      title: "Hero Intro Text",
      type: "text",
      rows: 5,
      group: "hero",
      description: "Separate paragraphs with a blank line.",
      validation: (Rule) => Rule.max(1200),
    }),
    defineField({
      name: "heroCtaLabel",
      title: "Hero CTA Label",
      type: "string",
      group: "hero",
      validation: (Rule) => Rule.max(60),
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
      name: "valuesLabel",
      title: "Section Headline",
      type: "string",
      group: "values",
      description: 'Visible “Unser Anspruch” label.',
      validation: (Rule) => Rule.max(120),
    }),
    defineField({
      name: "valuesItems",
      title: "Values",
      type: "array",
      group: "values",
      of: [
        {
          type: "object",
          name: "aboutValueItem",
          fields: [
            defineField({
              name: "title",
              title: "Title",
              type: "string",
              validation: (Rule) => Rule.required().max(80),
            }),
            defineField({
              name: "description",
              title: "Text",
              type: "text",
              rows: 3,
              validation: (Rule) => Rule.required().max(400),
            }),
          ],
          preview: {
            select: { title: "title", subtitle: "description" },
          },
        },
      ],
    }),

    defineField({
      name: "teamLabel",
      title: "Team Label",
      type: "string",
      group: "team",
      validation: (Rule) => Rule.max(80),
    }),
    defineField({
      name: "teamHeadline",
      title: "Team Headline",
      type: "string",
      group: "team",
      validation: (Rule) => Rule.max(160),
    }),
    defineField({
      name: "teamIntroduction",
      title: "Team Introduction",
      type: "text",
      rows: 3,
      group: "team",
      validation: (Rule) => Rule.max(400),
    }),
    defineField({
      name: "teamFeatureImage",
      title: "Studio Image",
      type: "image",
      group: "team",
      options: { hotspot: true },
      description: "Large atmospheric image beside the portraits.",
      fields: [imageAltField],
    }),
    defineField({
      name: "teamMembers",
      title: "Team Members",
      type: "array",
      group: "team",
      description:
        "Portraits in grid order. Leave name/role empty and mark as placeholder for empty slots.",
      of: [
        {
          type: "object",
          name: "aboutTeamMember",
          fields: [
            defineField({
              name: "name",
              title: "Name",
              type: "string",
              validation: (Rule) => Rule.max(120),
            }),
            defineField({
              name: "role",
              title: "Role / Function",
              type: "string",
              validation: (Rule) => Rule.max(160),
            }),
            defineField({
              name: "portrait",
              title: "Portrait",
              type: "image",
              options: { hotspot: true },
              fields: [imageAltField],
            }),
            defineField({
              name: "isPlaceholder",
              title: "Empty slot",
              type: "boolean",
              description: "Neutral tile with no invented person.",
              initialValue: false,
            }),
          ],
          preview: {
            select: {
              title: "name",
              subtitle: "role",
              media: "portrait",
              placeholder: "isPlaceholder",
            },
            prepare({ title, subtitle, media, placeholder }) {
              return {
                title: placeholder ? "Empty slot" : title || "Unnamed",
                subtitle: placeholder ? "Placeholder" : subtitle,
                media,
              };
            },
          },
        },
      ],
    }),

    defineField({
      name: "facts",
      title: "Facts",
      type: "array",
      group: "facts",
      of: [
        {
          type: "object",
          name: "aboutFact",
          fields: [
            defineField({
              name: "value",
              title: "Value",
              type: "string",
              description: 'e.g. “1992”, “5 Disziplinen”.',
              validation: (Rule) => Rule.required().max(80),
            }),
            defineField({
              name: "label",
              title: "Label",
              type: "string",
              validation: (Rule) => Rule.required().max(200),
            }),
          ],
          preview: {
            select: { title: "value", subtitle: "label" },
          },
        },
      ],
    }),

    defineField({
      name: "approachLabel",
      title: "Approach Label",
      type: "string",
      group: "approach",
      validation: (Rule) => Rule.max(80),
    }),
    defineField({
      name: "approachHeadline",
      title: "Approach Headline",
      type: "string",
      group: "approach",
      validation: (Rule) => Rule.max(160),
    }),
    defineField({
      name: "approachSubheadline",
      title: "Approach Subheadline",
      type: "string",
      group: "approach",
      validation: (Rule) => Rule.max(200),
    }),
    defineField({
      name: "approachText",
      title: "Approach Text",
      type: "text",
      rows: 5,
      group: "approach",
      description: "Separate paragraphs with a blank line.",
      validation: (Rule) => Rule.max(1200),
    }),
    defineField({
      name: "approachCtaLabel",
      title: "Approach CTA Label",
      type: "string",
      group: "approach",
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: "approachImage",
      title: "Approach Image",
      type: "image",
      group: "approach",
      options: { hotspot: true },
      fields: [imageAltField],
    }),

    defineField({
      name: "servicesLabel",
      title: "Services Label",
      type: "string",
      group: "services",
      validation: (Rule) => Rule.max(80),
    }),
    defineField({
      name: "servicesHeadline",
      title: "Services Headline",
      type: "string",
      group: "services",
      validation: (Rule) => Rule.max(160),
    }),
    defineField({
      name: "servicesItems",
      title: "Service items",
      type: "array",
      group: "services",
      description: "Order matches the four About service cards. Links stay in the website.",
      of: [
        {
          type: "object",
          name: "aboutServiceItem",
          fields: [
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
          ],
          preview: {
            select: { title: "title", subtitle: "description" },
          },
        },
      ],
    }),

    defineField({
      name: "clientsLabel",
      title: "Clients Label",
      type: "string",
      group: "cta",
      validation: (Rule) => Rule.max(80),
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
        title: title || "About",
        subtitle: "Singleton page content",
        media,
      };
    },
  },
});
