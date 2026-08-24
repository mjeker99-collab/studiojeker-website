import { defineField, defineType } from "sanity";
import { seoFields, sortOrderField } from "./shared";

const imageAltField = defineField({
  name: "alt",
  title: "Alt Text",
  type: "string",
  description: "Describe the image for accessibility.",
});

/**
 * Project / Work item — image, video, or mixed media.
 * Used for homepage teasers and standalone project records.
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
      name: "subtitle",
      title: "Subtitle (optional)",
      type: "string",
      group: "basics",
      validation: (Rule) => Rule.max(160),
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
      name: "href",
      title: "Link (optional)",
      type: "string",
      group: "basics",
      description: "Optional internal path or URL.",
      validation: (Rule) => Rule.max(200),
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
      name: "mediaType",
      title: "Primary Media Type",
      type: "string",
      group: "media",
      options: {
        list: [
          { title: "Image", value: "image" },
          { title: "Video (Vimeo or URL)", value: "video" },
        ],
        layout: "radio",
      },
      initialValue: "image",
    }),
    defineField({
      name: "mainImage",
      title: "Main Image",
      type: "image",
      group: "media",
      options: { hotspot: true },
      description: "Primary cover image for listings and detail pages.",
      fields: [imageAltField],
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
      title: "Vimeo URL",
      type: "string",
      group: "media",
      description: "Vimeo video ID or full URL for video projects.",
      hidden: ({ document }) => (document?.mediaType || "image") !== "video",
      validation: (Rule) => Rule.max(200),
    }),
    defineField({
      name: "externalVideoUrl",
      title: "External Video URL (optional)",
      type: "url",
      group: "media",
      description: "Optional direct MP4 or external video URL.",
      hidden: ({ document }) => (document?.mediaType || "image") !== "video",
      validation: (Rule) =>
        Rule.uri({ scheme: ["http", "https"], allowRelative: false }),
    }),
    defineField({
      name: "videoPoster",
      title: "Video Poster Image",
      type: "image",
      group: "media",
      options: { hotspot: true },
      description: "Still image shown before the video plays.",
      hidden: ({ document }) => (document?.mediaType || "image") !== "video",
      fields: [imageAltField],
    }),
    defineField({
      name: "videoAlt",
      title: "Video Description",
      type: "string",
      group: "media",
      hidden: ({ document }) => (document?.mediaType || "image") !== "video",
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
