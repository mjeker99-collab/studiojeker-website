import { defineArrayMember, defineField, defineType } from "sanity";
import { aiPageInitialValues } from "./aiDefaults";

/** Shared optional media + caption for KI text sections (uses existing mediaField). */
const aiSectionMediaFields = [
  defineField({
    name: "media",
    title: "Section Media (optional)",
    type: "mediaField",
    description:
      "Optional image or Vimeo video. Choose Media Type in the field. Leave empty for text-only — no placeholder is shown.",
  }),
  defineField({
    name: "caption",
    title: "Media Caption (optional)",
    type: "localizedString",
    description: "Short caption under the image/video when media is set.",
  }),
];

/**
 * KI / AI page singleton.
 * DE: /ki · EN: /en/ai
 * Reuses localizedString, localizedText, ctaField, mediaField — no parallel CMS structures.
 * Singleton desk ID: `ai` (see `studio/structure.ts`).
 *
 * Field ↔ frontend map (see also `aiDefaults.ts`):
 * heroSection → hero · introSection → intro · processSection → process
 * showreelSection → showreel · applicationsSection → applications
 * modelsSection → models · experienceSection → experience · approachSection → approach
 * visualMedia → optional showreel stills · landscapeBreaks → 16:9 editorial breaks
 * closingSection → closing · seoSection → seo
 */

/** Optional 16:9 landscape break — image or Vimeo via mediaField. Empty = hidden. */
const landscapeBreakFields = [
  defineField({
    name: "media",
    title: "Landscape Media (optional)",
    type: "mediaField",
    description:
      "Querformat (~16:9), full content width. Image or Vimeo. Leave empty to hide — no placeholder image.",
  }),
  defineField({
    name: "caption",
    title: "Caption (optional)",
    type: "localizedString",
    description: "Optional short caption under the image/video.",
  }),
];

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
    { name: "visuals", title: "Content images" },
    { name: "landscapeBreaks", title: "Landscape breaks" },
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
          description:
            "Optional soft line break with a newline (like About). Wording must stay unchanged.",
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
            "Image or short Vimeo loop (same as Homepage hero). For video: set Media Type → Video, paste Vimeo URL, and add a Poster. If Video is selected without a Vimeo URL, the Image/Poster still is shown as fallback. Video plays muted, autoplay, loop, no controls.",
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
        ...aiSectionMediaFields,
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
        "Central KI / Visibility showreel. Prefer Media Type Video (Vimeo), e.g. https://vimeo.com/1228871502. Layout matches About.",
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
      title: "Content images (5)",
      type: "object",
      group: "visuals",
      options: { collapsible: true, collapsed: false },
      description:
        "Five showreel stills for the KI page. Upload originals only. Empty slots are hidden on the website (no grey placeholders). Section Media fields override these when set.",
      fields: [
        defineField({
          name: "keyVisual",
          title: "AI Keyvisual",
          type: "image",
          options: { hotspot: true },
          description:
            "Bild 1 — Designer/Motorrad. Shown with “KI ist für uns ein Werkzeug…”.",
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
          title: "3D / Clay Villa",
          type: "image",
          options: { hotspot: true },
          description: "Bild 2 — Clay villa. Paired with Photoreal Production.",
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
          title: "Photoreal Production",
          type: "image",
          options: { hotspot: true },
          description:
            "Bild 3 — Photoreal villa. Visual counterpart to 3D / Clay.",
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
          title: "Content Formats",
          type: "image",
          options: { hotspot: true },
          description: "Bild 4 — Distribution / multiple formats.",
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
          title: "Distribution / Social Channels",
          type: "image",
          options: { hotspot: true },
          description: "Bild 5 — Formats + social channels → Visibility.",
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
      name: "landscapeBreaks",
      title: "Landscape media breaks (16:9)",
      type: "object",
      group: "landscapeBreaks",
      options: { collapsible: true, collapsed: false },
      description:
        "Optional large landscape (~16:9) image or Vimeo between process steps and text blocks. Empty slots collapse — no static placeholder images.",
      fields: [
        defineField({
          name: "afterAi",
          title: "After AI (Produktion / KI)",
          type: "object",
          options: { collapsible: true, collapsed: false },
          description:
            "Between AI and DISTRIBUTION in “Vom Konzept zur Sichtbarkeit”.",
          fields: landscapeBreakFields,
        }),
        defineField({
          name: "afterDistribution",
          title: "After DISTRIBUTION",
          type: "object",
          options: { collapsible: true, collapsed: false },
          description: "Between DISTRIBUTION and VISIBILITY.",
          fields: landscapeBreakFields,
        }),
        defineField({
          name: "afterVisibility",
          title: "After VISIBILITY",
          type: "object",
          options: { collapsible: true, collapsed: false },
          description:
            "After VISIBILITY, before “Wo wir KI einsetzen”.",
          fields: landscapeBreakFields,
        }),
        defineField({
          name: "midApplications",
          title: "Mid Applications (after 01–03)",
          type: "object",
          options: { collapsible: true, collapsed: false },
          description:
            "Between application items 01–03 and 04–06 (“Wo wir KI einsetzen”).",
          fields: landscapeBreakFields,
        }),
        defineField({
          name: "afterApplications",
          title: "After Applications (after 04–06)",
          type: "object",
          options: { collapsible: true, collapsed: false },
          description:
            "After “Wo wir KI einsetzen”, before “Die besten Modelle…”.",
          fields: landscapeBreakFields,
        }),
        defineField({
          name: "afterModels",
          title: "After Models",
          type: "object",
          options: { collapsible: true, collapsed: false },
          description:
            "Between “Die besten Modelle…” and “KI + Erfahrung”.",
          fields: landscapeBreakFields,
        }),
        defineField({
          name: "afterExperience",
          title: "After Experience",
          type: "object",
          options: { collapsible: true, collapsed: false },
          description:
            "Between “KI + Erfahrung” and “Gezielt. Verantwortungsbewusst…”.",
          fields: landscapeBreakFields,
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
        ...aiSectionMediaFields,
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
        ...aiSectionMediaFields,
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
        ...aiSectionMediaFields,
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
        ...aiSectionMediaFields,
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
