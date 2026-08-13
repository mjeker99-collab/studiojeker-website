import { defineField, defineType } from "sanity";
import { seoFields } from "./shared";

/**
 * About page — singleton editorial content.
 * Team members are referenced, not hardcoded.
 */
export const about = defineType({
  name: "about",
  title: "About",
  type: "document",
  groups: [
    { name: "hero", title: "Hero", default: true },
    { name: "philosophy", title: "Philosophy" },
    { name: "media", title: "Images" },
    { name: "facts", title: "Facts" },
    { name: "team", title: "Team" },
    { name: "cta", title: "CTA" },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({
      name: "pageHeadline",
      title: "Page Headline",
      type: "string",
      group: "hero",
      validation: (Rule) => Rule.required().max(160),
    }),
    defineField({
      name: "introClaim",
      title: "Intro / Claim",
      type: "string",
      group: "hero",
      description: "Short claim under the headline.",
      validation: (Rule) => Rule.max(200),
    }),
    defineField({
      name: "introText",
      title: "Intro Text",
      type: "text",
      rows: 5,
      group: "hero",
      validation: (Rule) => Rule.max(1200),
    }),
    defineField({
      name: "mainImage",
      title: "Main Image",
      type: "image",
      group: "hero",
      options: { hotspot: true },
    }),

    defineField({
      name: "philosophyHeadline",
      title: "Philosophy Headline",
      type: "string",
      group: "philosophy",
      description: 'e.g. “Unser Anspruch”.',
      validation: (Rule) => Rule.max(120),
    }),
    defineField({
      name: "philosophyText",
      title: "Philosophy Text",
      type: "text",
      rows: 5,
      group: "philosophy",
      validation: (Rule) => Rule.max(1500),
    }),

    defineField({
      name: "additionalImages",
      title: "Additional Images",
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
              description: "Describe the image for accessibility.",
            }),
          ],
        },
      ],
    }),

    defineField({
      name: "foundedYear",
      title: "Founded Year",
      type: "string",
      group: "facts",
      description: 'e.g. “1992”.',
      validation: (Rule) => Rule.max(20),
    }),
    defineField({
      name: "disciplinesFact",
      title: "Number of Disciplines / Fact",
      type: "string",
      group: "facts",
      description: 'e.g. “5 Disziplinen”.',
      validation: (Rule) => Rule.max(80),
    }),
    defineField({
      name: "partnerNetworkText",
      title: "Partner Network Text",
      type: "text",
      rows: 3,
      group: "facts",
      validation: (Rule) => Rule.max(400),
    }),
    defineField({
      name: "contactPersonText",
      title: "Contact Person Text",
      type: "text",
      rows: 3,
      group: "facts",
      description: "Text about having one contact person / partner approach.",
      validation: (Rule) => Rule.max(400),
    }),

    defineField({
      name: "teamMembers",
      title: "Team Members",
      type: "array",
      group: "team",
      description: "Select active team members to feature on About.",
      of: [
        {
          type: "reference",
          to: [{ type: "teamMember" }],
        },
      ],
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
  preview: {
    select: {
      title: "pageHeadline",
      media: "mainImage",
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
