import { defineArrayMember, defineField, defineType } from "sanity";
import { aiPageInitialValues } from "./aiDefaults";

/**
 * KI / AI page singleton.
 * DE: /ki · EN: /en/ai
 * Reuses localizedString, localizedText, ctaField, mediaField — no parallel CMS structures.
 * Singleton desk ID: `ai` (see `studio/structure.ts`).
 */
export const ai = defineType({
  name: "ai",
  title: "KI / AI",
  type: "document",
  // Prefill when the singleton is first created in Studio (matches live /ki copy).
  initialValue: aiPageInitialValues,
  groups: [
    { name: "hero", title: "Hero", default: true },
    { name: "intro", title: "Intro" },
    { name: "process", title: "Process flow" },
    { name: "showreel", title: "Showreel" },
    { name: "visuals", title: "Showreel stills" },
    { name: "applications", title: "Applications" },
    { name: "models", title: "Models" },
    { name: "experience", title: "Experience" },
    { name: "approach", title: "Approach" },
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
      title: "Intro",
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
      name: "processSection",
      title: "Process flow",
      type: "object",
      group: "process",
      options: { collapsible: true },
      description:
        "CONCEPT → PRODUCTION → AI → DISTRIBUTION → VISIBILITY. Order = display order.",
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
          name: "introduction",
          title: "Introduction",
          type: "localizedText",
        }),
        defineField({
          name: "steps",
          title: "Process steps",
          type: "array",
          of: [
            defineArrayMember({
              type: "object",
              name: "aiProcessStep",
              fields: [
                defineField({
                  name: "id",
                  title: "Step ID",
                  type: "string",
                  description:
                    "Stable key (concept, production, ai, distribution, visibility).",
                  validation: (Rule) => Rule.required().max(60),
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
                select: { titleDe: "title.de", id: "id" },
                prepare({ titleDe, id }) {
                  return {
                    title: titleDe || id || "Step",
                  };
                },
              },
            }),
          ],
          validation: (Rule) => Rule.max(8),
        }),
      ],
    }),

    defineField({
      name: "showreelSection",
      title: "Showreel",
      type: "object",
      group: "showreel",
      options: { collapsible: true },
      description:
        "Central KI / Visibility showreel. Prefer Media Type Video (Vimeo), e.g. https://vimeo.com/1228871502.",
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
          title: "Body Text",
          type: "localizedText",
        }),
        defineField({
          name: "cta",
          title: "CTA",
          type: "ctaField",
        }),
        defineField({
          name: "media",
          title: "Showreel media",
          type: "mediaField",
          description:
            "Image poster and/or Vimeo URL. Uses the existing website showreel player. Vimeo must stay editable here.",
        }),
      ],
    }),

    defineField({
      name: "visualMedia",
      title: "Showreel stills",
      type: "object",
      group: "visuals",
      options: { collapsible: true, collapsed: false },
      description:
        "Five stills from the KI showreel. Upload originals only — no crop that cuts important content. Layout preserves aspect ratio (contain).",
      fields: [
        defineField({
          name: "keyVisual",
          title: "Bild 1 — AI Keyvisual",
          type: "image",
          options: { hotspot: true },
          description:
            "Designer/Motorrad vor Alpen. Shown with the intro (“KI ist für uns ein Werkzeug…”).",
          fields: [
            defineField({
              name: "alt",
              title: "Alt Text",
              type: "string",
            }),
          ],
        }),
        defineField({
          name: "clayVilla",
          title: "Bild 2 — 3D / Clay Villa",
          type: "image",
          options: { hotspot: true },
          description:
            "Weisses Clay-Rendering der Villa. Pairs with Bild 3 (Production / 3D).",
          fields: [
            defineField({
              name: "alt",
              title: "Alt Text",
              type: "string",
            }),
          ],
        }),
        defineField({
          name: "photoVilla",
          title: "Bild 3 — Photorealistische Villa",
          type: "image",
          options: { hotspot: true },
          description:
            "Fotorealistische Villa mit Motorrad. Visual counterpart to Bild 2.",
          fields: [
            defineField({
              name: "alt",
              title: "Alt Text",
              type: "string",
            }),
          ],
        }),
        defineField({
          name: "contentFormats",
          title: "Bild 4 — Content Formate",
          type: "image",
          options: { hotspot: true },
          description:
            "Mehrere Formate auf schwarzem Grund. DISTRIBUTION section.",
          fields: [
            defineField({
              name: "alt",
              title: "Alt Text",
              type: "string",
            }),
          ],
        }),
        defineField({
          name: "distributionChannels",
          title: "Bild 5 — Distribution / Social Channels",
          type: "image",
          options: { hotspot: true },
          description:
            "Formate mit Social-Media-Symbolen. End of Distribution / Visibility.",
          fields: [
            defineField({
              name: "alt",
              title: "Alt Text",
              type: "string",
            }),
          ],
        }),
      ],
    }),

    defineField({
      name: "applicationsSection",
      title: "Where we use AI",
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
