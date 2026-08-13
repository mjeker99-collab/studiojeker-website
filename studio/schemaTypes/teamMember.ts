import { defineField, defineType } from "sanity";
import { sortOrderField } from "./shared";

/**
 * Team member — referenced from About and listing pages later.
 */
export const teamMember = defineType({
  name: "teamMember",
  title: "Team Member",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      name: "role",
      title: "Role / Function",
      type: "string",
      validation: (Rule) => Rule.required().max(160),
    }),
    defineField({
      name: "portrait",
      title: "Portrait",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "shortBio",
      title: "Short Bio",
      type: "text",
      rows: 4,
      validation: (Rule) => Rule.max(800),
    }),
    defineField({
      name: "email",
      title: "Email",
      type: "string",
      validation: (Rule) => Rule.email(),
    }),
    defineField({
      name: "phone",
      title: "Phone",
      type: "string",
      validation: (Rule) => Rule.max(40),
    }),
    defineField({
      name: "linkedinUrl",
      title: "LinkedIn URL",
      type: "url",
      validation: (Rule) =>
        Rule.uri({ scheme: ["http", "https"], allowRelative: false }),
    }),
    sortOrderField(),
    defineField({
      name: "active",
      title: "Active",
      type: "boolean",
      description: "Inactive members are hidden from public listings later.",
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
      role: "role",
      media: "portrait",
      active: "active",
    },
    prepare({ title, role, media, active }) {
      return {
        title: title || "Unnamed",
        subtitle: [active === false ? "Inactive" : null, role]
          .filter(Boolean)
          .join(" · "),
        media,
      };
    },
  },
});
