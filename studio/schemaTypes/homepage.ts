import { defineField, defineType } from "sanity";

/**
 * First test document type for Sanity Studio content editing.
 * Not connected to the Next.js marketing site yet.
 */
export const homepage = defineType({
  name: "homepage",
  title: "Homepage",
  type: "document",
  fields: [
    defineField({
      name: "heroHeadline",
      title: "Hero Headline",
      type: "string",
    }),
    defineField({
      name: "introText",
      title: "Intro Text",
      type: "text",
      rows: 4,
    }),
    defineField({
      name: "heroImage",
      title: "Hero Image",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
  ],
  preview: {
    select: {
      title: "heroHeadline",
      media: "heroImage",
    },
    prepare({ title, media }) {
      return {
        title: title || "Homepage",
        media,
      };
    },
  },
});
