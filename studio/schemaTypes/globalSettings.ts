import { defineField, defineType } from "sanity";

/**
 * Global site settings — singleton. Content only (no design tokens).
 */
export const globalSettings = defineType({
  name: "globalSettings",
  title: "Global Settings",
  type: "document",
  groups: [
    { name: "company", title: "Company", default: true },
    { name: "social", title: "Social" },
    { name: "seo", title: "Default SEO" },
  ],
  fields: [
    defineField({
      name: "companyName",
      title: "Company Name",
      type: "string",
      group: "company",
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      name: "contactEmail",
      title: "General Contact Email",
      type: "string",
      group: "company",
      validation: (Rule) => Rule.email(),
    }),
    defineField({
      name: "phone",
      title: "Phone",
      type: "string",
      group: "company",
      validation: (Rule) => Rule.max(40),
    }),
    defineField({
      name: "address",
      title: "Address",
      type: "text",
      rows: 4,
      group: "company",
      description: "Postal address as shown in the footer / contact areas.",
      validation: (Rule) => Rule.max(400),
    }),
    defineField({
      name: "footerCopyrightText",
      title: "Footer Copyright Text",
      type: "string",
      group: "company",
      validation: (Rule) => Rule.max(160),
    }),

    defineField({
      name: "instagramUrl",
      title: "Instagram URL",
      type: "url",
      group: "social",
      validation: (Rule) =>
        Rule.uri({ scheme: ["http", "https"], allowRelative: false }),
    }),
    defineField({
      name: "linkedinUrl",
      title: "LinkedIn URL",
      type: "url",
      group: "social",
      validation: (Rule) =>
        Rule.uri({ scheme: ["http", "https"], allowRelative: false }),
    }),
    defineField({
      name: "vimeoUrl",
      title: "Vimeo URL",
      type: "url",
      group: "social",
      validation: (Rule) =>
        Rule.uri({ scheme: ["http", "https"], allowRelative: false }),
    }),

    defineField({
      name: "defaultSeoTitle",
      title: "Default SEO Title",
      type: "string",
      group: "seo",
      validation: (Rule) =>
        Rule.max(70).warning("Prefer 60 characters or fewer."),
    }),
    defineField({
      name: "defaultSeoDescription",
      title: "Default SEO Description",
      type: "text",
      rows: 3,
      group: "seo",
      validation: (Rule) =>
        Rule.max(180).warning("Prefer 160 characters or fewer."),
    }),
  ],
  preview: {
    select: {
      title: "companyName",
    },
    prepare({ title }) {
      return {
        title: title || "Global Settings",
        subtitle: "Singleton site settings",
      };
    },
  },
});
