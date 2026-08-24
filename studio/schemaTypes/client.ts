import { defineField, defineType } from "sanity";
import { sortOrderField } from "./shared";

/**
 * Client / Logo — feeds the client marquee on Homepage and Contact.
 *
 * Every published document with Enabled = true and a logo asset appears
 * automatically (ordered by sortOrder). There is no curated subset or
 * fixed quantity cap on the live site.
 */
export const client = defineType({
  name: "client",
  title: "Client",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Client Name",
      type: "string",
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      name: "logo",
      title: "Logo",
      type: "image",
      options: { hotspot: true },
      description: "Prefer SVG or transparent PNG for logo strips.",
      validation: (Rule) => Rule.required(),
      fields: [
        defineField({
          name: "alt",
          title: "Alt Text",
          type: "string",
          description: "Describe the logo for accessibility.",
        }),
      ],
    }),
    defineField({
      name: "websiteUrl",
      title: "Website URL",
      type: "url",
      validation: (Rule) =>
        Rule.uri({ scheme: ["http", "https"], allowRelative: false }),
    }),
    sortOrderField(),
    defineField({
      name: "active",
      title: "Enabled",
      type: "boolean",
      description:
        "When enabled, this logo appears in the public marquee after Publish. Disabled logos are excluded. There is no maximum number of logos.",
      initialValue: true,
    }),
  ],
  orderings: [
    {
      title: "Sort order",
      name: "sortOrderAsc",
      by: [{ field: "sortOrder", direction: "asc" }],
    },
    {
      title: "Name",
      name: "nameAsc",
      by: [{ field: "name", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      title: "name",
      media: "logo",
      active: "active",
    },
    prepare({ title, media, active }) {
      return {
        title: title || "Unnamed client",
        subtitle: active === false ? "Disabled" : "Enabled",
        media,
      };
    },
  },
});
