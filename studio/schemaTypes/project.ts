import { defineField, defineType } from "sanity";
import { seoFields, sortOrderField } from "./shared";

/**
 * Project / Work item — image, video, or mixed media.
 */
export const project = defineType({
  name: "project",
  title: "Project",
  type: "document",
  groups: [
    { name: "basics", title: "Basics", default: true },
    { name: "media", title: "Media" },
    { name: "content", title: "Description" },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Project Title",
      type: "string",
      group: "basics",
      validation: (Rule) => Rule.required().max(160),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      group: "basics",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "client",
      title: "Client",
      type: "string",
      group: "basics",
      validation: (Rule) => Rule.max(120),
    }),
    defineField({
      name: "category",
      title: "Category / Service",
      type: "reference",
      group: "basics",
      to: [{ type: "service" }],
      description: "Optional link to a service area.",
    }),
    defineField({
      name: "shortDescription",
      title: "Short Description",
      type: "text",
      rows: 3,
      group: "basics",
      validation: (Rule) => Rule.max(400),
    }),
    defineField({
      name: "year",
      title: "Year",
      type: "string",
      group: "basics",
      validation: (Rule) => Rule.max(10),
    }),
    defineField({
      name: "featured",
      title: "Featured Project",
      type: "boolean",
      group: "basics",
      description: "Highlight on Work / homepage listings when connected later.",
      initialValue: false,
    }),
    sortOrderField("basics"),

    defineField({
      name: "mainImage",
      title: "Main Image",
      type: "image",
      group: "media",
      options: { hotspot: true },
      description: "Primary cover image for listings and detail pages.",
    }),
    defineField({
      name: "gallery",
      title: "Gallery Images",
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
            defineField({
              name: "caption",
              title: "Caption",
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
      description: "Primary Vimeo URL for video projects.",
      validation: (Rule) =>
        Rule.uri({ scheme: ["http", "https"], allowRelative: false }),
    }),
    defineField({
      name: "additionalVideoUrls",
      title: "Additional Video URLs",
      type: "array",
      group: "media",
      of: [
        {
          type: "url",
          validation: (Rule) =>
            Rule.uri({ scheme: ["http", "https"], allowRelative: false }),
        },
      ],
    }),

    defineField({
      name: "projectDescription",
      title: "Project Description",
      type: "text",
      rows: 8,
      group: "content",
      validation: (Rule) => Rule.max(4000),
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
      title: "Title",
      name: "titleAsc",
      by: [{ field: "title", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      title: "title",
      client: "client",
      media: "mainImage",
      featured: "featured",
    },
    prepare({ title, client, media, featured }) {
      return {
        title: title || "Untitled project",
        subtitle: [featured ? "Featured" : null, client]
          .filter(Boolean)
          .join(" · "),
        media,
      };
    },
  },
});
