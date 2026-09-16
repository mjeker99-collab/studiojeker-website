import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * KI / AI page singleton.
 * DE: /ki · EN: /en/ai
 * Reuses localizedString, localizedText, ctaField, mediaField — no parallel CMS structures.
 */
export const ai = defineType({
  name: "ai",
  title: "KI / AI",
  type: "document",
  groups: [
    { name: "hero", title: "Hero", default: true },
    { name: "intro", title: "Section 1 — Intro" },
    { name: "applications", title: "Section 2 — Applications" },
    { name: "models", title: "Section 3 — Models" },
    { name: "experience", title: "Section 4 — Experience" },
    { name: "approach", title: "Section 5 — Approach" },
    { name: "cta", title: "Closing CTA" },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({
      name: "heroSection",
      title: "Hero",
      type: "object",
      group: "hero",
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({
          name: "label",
          title: "Eyebrow",
          type: "localizedString",
        }),
        defineField({
          name: "headline",
          title: "Headline",
          type: "localizedString",
        }),
        defineField({
          name: "text",
          title: "Intro Text",
          type: "localizedText",
          description: "Hero intro under the headline.",
        }),
        defineField({
          name: "media",
          title: "Hero Media",
          type: "mediaField",
          description:
            "Image or short Vimeo loop for the hero. Video plays muted, autoplay, loop, no controls.",
        }),
      ],
    }),

    defineField({
      name: "introSection",
      title: "Section 1 — Intro",
      type: "object",
      group: "intro",
      options: { collapsible: true },
      fields: [
        defineField({
          name: "headline",
          title: "Headline",
          type: "localizedString",
        }),
        defineField({
          name: "text",
          title: "Body Text",
          type: "localizedText",
          description: "Separate paragraphs with a blank line.",
        }),
        defineField({
          name: "media",
          title: "Section Media (optional)",
          type: "mediaField",
          description: "Optional image or short video for this section.",
        }),
      ],
    }),

    defineField({
      name: "applicationsSection",
      title: "Section 2 — Where we use AI",
      type: "object",
      group: "applications",
      options: { collapsible: true },
      fields: [
        defineField({
          name: "headline",
          title: "Headline",
          type: "localizedString",
        }),
        defineField({
          name: "items",
          title: "Application Areas",
          type: "array",
          description: "Six areas (01–06). Order = display order.",
          of: [
            defineArrayMember({
              type: "object",
              name: "aiApplicationItem",
              fields: [
                defineField({
                  name: "id",
                  title: "Item ID",
                  type: "string",
                  description:
                    "Stable key (concept, storyboarding, planning, postproduction, generation, visualisation).",
                  validation: (Rule) => Rule.required().max(60),
                }),
                defineField({
                  name: "number",
                  title: "Number Label",
                  type: "string",
                  description: "Display number, e.g. 01",
                  validation: (Rule) => Rule.required().max(10),
                }),
                defineField({
                  name: "title",
                  title: "Title",
                  type: "localizedString",
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: "description",
                  title: "Description",
                  type: "localizedText",
                }),
              ],
              preview: {
                select: {
                  titleDe: "title.de",
                  number: "number",
                },
                prepare({ titleDe, number }) {
                  return {
                    title: `${number || "—"} ${titleDe || "Application"}`,
                  };
                },
              },
            }),
          ],
          validation: (Rule) => Rule.max(8),
        }),
        defineField({
          name: "media",
          title: "Section Media (optional)",
          type: "mediaField",
        }),
      ],
    }),

    defineField({
      name: "modelsSection",
      title: "Section 3 — Models",
      type: "object",
      group: "models",
      options: { collapsible: true },
      fields: [
        defineField({
          name: "headline",
          title: "Headline",
          type: "localizedString",
        }),
        defineField({
          name: "text",
          title: "Body Text",
          type: "localizedText",
          description: "Separate paragraphs with a blank line.",
        }),
        defineField({
          name: "media",
          title: "Section Media (optional)",
          type: "mediaField",
        }),
      ],
    }),

    defineField({
      name: "experienceSection",
      title: "Section 4 — Experience",
      type: "object",
      group: "experience",
      options: { collapsible: true },
      fields: [
        defineField({
          name: "headline",
          title: "Headline",
          type: "localizedString",
        }),
        defineField({
          name: "text",
          title: "Body Text",
          type: "localizedText",
          description: "Separate paragraphs with a blank line.",
        }),
        defineField({
          name: "media",
          title: "Section Media (optional)",
          type: "mediaField",
        }),
      ],
    }),

    defineField({
      name: "approachSection",
      title: "Section 5 — Approach",
      type: "object",
      group: "approach",
      options: { collapsible: true },
      fields: [
        defineField({
          name: "headline",
          title: "Headline",
          type: "localizedString",
        }),
        defineField({
          name: "text",
          title: "Body Text",
          type: "localizedText",
          description: "Separate paragraphs with a blank line.",
        }),
        defineField({
          name: "media",
          title: "Section Media (optional)",
          type: "mediaField",
        }),
      ],
    }),

    defineField({
      name: "closingSection",
      title: "Closing CTA",
      type: "object",
      group: "cta",
      options: { collapsible: true },
      fields: [
        defineField({
          name: "headline",
          title: "CTA Headline",
          type: "localizedString",
        }),
        defineField({
          name: "text",
          title: "CTA Text",
          type: "localizedText",
        }),
        defineField({
          name: "cta",
          title: "CTA Button",
          type: "ctaField",
          description: "Label + link. Default destination: /contact",
        }),
      ],
    }),

    defineField({
      name: "clientsLabel",
      title: "Clients Label",
      type: "localizedString",
      group: "cta",
      description: "Optional label above the logo slider.",
    }),

    defineField({
      name: "seoSection",
      title: "SEO",
      type: "object",
      group: "seo",
      options: { collapsible: true },
      fields: [
        defineField({
          name: "title",
          title: "SEO Title",
          type: "localizedString",
        }),
        defineField({
          name: "description",
          title: "Meta Description",
          type: "localizedText",
        }),
        defineField({
          name: "ogImage",
          title: "Social Sharing Image",
          type: "image",
          options: { hotspot: true },
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: "heroSection.headline.de",
      titleEn: "heroSection.headline.en",
    },
    prepare({ title, titleEn }) {
      return {
        title: "KI / AI",
        subtitle: title || titleEn || "Artificial intelligence page",
      };
    },
  },
});
