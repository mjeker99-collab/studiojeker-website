import { defineField } from "sanity";

/** Shared SEO fields — content only, no design controls. */
export const seoFields = [
  defineField({
    name: "seoTitle",
    title: "SEO Title",
    type: "string",
    description: "Search result title. Keep under ~60 characters.",
    validation: (Rule) => Rule.max(70).warning("Prefer 60 characters or fewer."),
  }),
  defineField({
    name: "seoDescription",
    title: "SEO Description",
    type: "text",
    rows: 3,
    description: "Search result description. Keep under ~160 characters.",
    validation: (Rule) =>
      Rule.max(180).warning("Prefer 160 characters or fewer."),
  }),
];

export const urlField = (
  name: string,
  title: string,
  options?: { required?: boolean; description?: string },
) =>
  defineField({
    name,
    title,
    type: "url",
    description: options?.description,
    validation: (Rule) => {
      const base = Rule.uri({
        scheme: ["http", "https"],
        allowRelative: false,
      });
      return options?.required ? base.required() : base;
    },
  });

export const sortOrderField = (group?: string) =>
  defineField({
    name: "sortOrder",
    title: "Sort Order",
    type: "number",
    group,
    description: "Lower numbers appear first. Leave empty to use default order.",
    validation: (Rule) => Rule.integer().min(0),
  });
