import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * Content-Abo / Visibility Subscription landing page singleton.
 * DE: /content-abo · EN: /en/content-subscription
 * Reuses shared localizedString, localizedText, ctaField, mediaField,
 * homepageBenefitItem — no parallel CMS structures.
 */
export const abo = defineType({
  name: "abo",
  title: "Content Abo",
  type: "document",
  groups: [
    { name: "hero", title: "Hero", default: true },
    { name: "problem", title: "Problem / Intro" },
    { name: "benefits", title: "Benefits" },
    { name: "process", title: "Process" },
    { name: "scope", title: "Scope" },
    { name: "showreel", title: "Showreel" },
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
            "Die deutsche Hero-Headline auf /content-abo. Hier den gewünschten kurzen Wortlaut bearbeiten und veröffentlichen; das Website-Layout bleibt unverändert.",
        }),
        defineField({
          name: "text",
          title: "Body Text",
          type: "localizedText",
        }),
        defineField({
          name: "cta",
          title: "Primary CTA",
          type: "ctaField",
          description: "Default destination: /contact",
        }),
        defineField({
          name: "media",
          title: "Hero-Bild",
          type: "mediaField",
          description:
            "Bild rechts im Hero: Media Type → Image, dann Image ersetzen. Alt-Text, Ausschnitt und Hotspot am Bild bearbeiten. Der Hero spielt kein Video ab. Anschliessend veröffentlichen.",
          validation: (Rule) => Rule.custom((value) => {
            const media = value as { mediaType?: string } | undefined;
            return media?.mediaType === "video"
              ? "Der Hero zeigt ein Bild. Bitte Media Type auf Image stellen und das Hero-Bild unter Image bearbeiten."
              : true;
          }).warning(),
        }),
      ],
    }),

    defineField({
      name: "problemSection",
      title: "Problem / Intro",
      type: "object",
      group: "problem",
      options: { collapsible: true },
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
          description: "Separate paragraphs with a blank line.",
        }),
        defineField({
          name: "highlight",
          title: "Highlighted Statement",
          type: "localizedText",
        }),
      ],
    }),

    defineField({
      name: "benefitsSection",
      title: "Benefits",
      type: "object",
      group: "benefits",
      options: { collapsible: true },
      fields: [
        defineField({
          name: "items",
          title: "Benefit Items",
          type: "array",
          of: [defineArrayMember({ type: "homepageBenefitItem" })],
          description:
            "Same icon keys as the homepage Abo module (continuous, system, visibility, planning).",
        }),
      ],
    }),

    defineField({
      name: "processSection",
      title: "Process",
      type: "object",
      group: "process",
      options: { collapsible: true },
      fields: [
        defineField({
          name: "headline",
          title: "Headline",
          type: "localizedString",
        }),
        defineField({
          name: "steps",
          title: "Steps",
          type: "array",
          of: [
            defineArrayMember({
              type: "object",
              name: "aboProcessStep",
              fields: [
                defineField({
                  name: "id",
                  title: "Step ID",
                  type: "string",
                  description: "Stable key (plan, produce, publish, develop).",
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: "number",
                  title: "Number Label",
                  type: "string",
                  description: "Display number, e.g. 01",
                  validation: (Rule) => Rule.required(),
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
                    title: `${number || "—"} ${titleDe || "Step"}`,
                  };
                },
              },
            }),
          ],
        }),
      ],
    }),

    defineField({
      name: "scopeSection",
      title: "Scope of Work",
      type: "object",
      group: "scope",
      options: { collapsible: true },
      description: "No package prices in V1.",
      fields: [
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
          name: "items",
          title: "Disciplines",
          type: "array",
          of: [
            defineArrayMember({
              type: "object",
              name: "aboScopeItem",
              fields: [
                defineField({
                  name: "label",
                  title: "Label",
                  type: "localizedString",
                  validation: (Rule) => Rule.required(),
                }),
              ],
              preview: {
                select: { title: "label.de" },
                prepare({ title }) {
                  return { title: title || "Discipline" };
                },
              },
            }),
          ],
        }),
        defineField({
          name: "closing",
          title: "Closing Text",
          type: "localizedText",
        }),
        defineField({
          name: "highlight",
          title: "Highlighted Statement",
          type: "localizedText",
        }),
      ],
    }),

    defineField({
      name: "showreelSection",
      title: "Showreel",
      type: "object",
      group: "showreel",
      options: { collapsible: true },
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
          title: "Showreel Media",
          type: "mediaField",
          description:
            "Image: set Media Type → Image and upload under Image. Video: Media Type → Video (Vimeo), set Vimeo URL + Video Poster Image. Publish to update staging.",
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
      ],
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
        title: "Content Abo",
        subtitle: title || titleEn || "Visibility subscription landing page",
      };
    },
  },
});
