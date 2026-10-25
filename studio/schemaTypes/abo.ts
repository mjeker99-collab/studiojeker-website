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
    { name: "packages", title: "Packages" },
    { name: "promo", title: "Promotion" },
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
        defineField({
          name: "image",
          title: "Section Image",
          type: "image",
          options: { hotspot: true },
          description:
            "Bild links im Kontinuitäts-Block (Bild links / Text rechts). Ausschnitt und Hotspot am Bild einstellen. Ohne Bild erscheint ein neutraler Platzhalter.",
          fields: [
            defineField({
              name: "alt",
              title: "Image Alt Text",
              type: "string",
              description: "Describe the image for accessibility and SEO.",
            }),
          ],
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
      name: "packagesSection",
      title: "Package Comparison",
      type: "object",
      group: "packages",
      options: { collapsible: true, collapsed: false },
      description:
        "Drei Visibility-Pakete mit editierbarem Leistungsumfang und Preis. Keine konkreten Stückzahlen erfinden.",
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
          name: "vatNote",
          title: "VAT / MWST Note",
          type: "localizedString",
          description:
            "MWST-Hinweis an den Preisen. Ausweisung zur Prüfung markieren, bis die finale Formulierung freigegeben ist.",
        }),
        defineField({
          name: "packages",
          title: "Packages",
          type: "array",
          of: [
            defineArrayMember({
              type: "object",
              name: "aboPackage",
              fields: [
                defineField({
                  name: "id",
                  title: "Package ID",
                  type: "string",
                  description: "Stable key (start, plus, individual).",
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: "name",
                  title: "Name",
                  type: "localizedString",
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: "price",
                  title: "Price Label",
                  type: "localizedString",
                  description:
                    "Display price, e.g. CHF 650.– or Preis auf Anfrage. Editable in Studio.",
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: "priceSuffix",
                  title: "Price Suffix",
                  type: "localizedString",
                  description: "Optional period label, e.g. /Monat.",
                }),
                defineField({
                  name: "summary",
                  title: "Summary",
                  type: "localizedText",
                  description:
                    "Short positioning (audience + focus). No invented quantities.",
                }),
                defineField({
                  name: "features",
                  title: "Scope Features",
                  type: "array",
                  of: [
                    defineArrayMember({
                      type: "object",
                      name: "aboPackageFeature",
                      fields: [
                        defineField({
                          name: "label",
                          title: "Feature",
                          type: "localizedString",
                          validation: (Rule) => Rule.required(),
                        }),
                      ],
                      preview: {
                        select: { title: "label.de" },
                        prepare({ title }) {
                          return { title: title || "Feature" };
                        },
                      },
                    }),
                  ],
                }),
                defineField({
                  name: "highlighted",
                  title: "Highlighted",
                  type: "boolean",
                  description: "Visually emphasize this package (e.g. Plus).",
                  initialValue: false,
                }),
                defineField({
                  name: "cta",
                  title: "Contact CTA",
                  type: "ctaField",
                  description: "Default destination: /contact",
                }),
                defineField({
                  name: "sortOrder",
                  title: "Sort Order",
                  type: "number",
                  description: "Lower numbers appear first.",
                  validation: (Rule) => Rule.integer().min(0),
                }),
              ],
              preview: {
                select: {
                  titleDe: "name.de",
                  priceDe: "price.de",
                  id: "id",
                },
                prepare({ titleDe, priceDe, id }) {
                  return {
                    title: titleDe || id || "Package",
                    subtitle: priceDe || undefined,
                  };
                },
              },
            }),
          ],
        }),
      ],
    }),

    defineField({
      name: "promoSection",
      title: "Limited Promotion",
      type: "object",
      group: "promo",
      options: { collapsible: true },
      description:
        "Zeitlich begrenzte Aktion. Frontend zeigt den Block nur innerhalb von Start–Ende (Europe/Zurich, inklusiv).",
      fields: [
        defineField({
          name: "enabled",
          title: "Enabled",
          type: "boolean",
          initialValue: true,
          description: "When off, the promo never renders — regardless of dates.",
        }),
        defineField({
          name: "startDate",
          title: "Start Date",
          type: "date",
          description: "Inclusive. Europe/Zurich calendar day.",
          options: { dateFormat: "DD.MM.YYYY" },
        }),
        defineField({
          name: "endDate",
          title: "End Date",
          type: "date",
          description: "Inclusive. Europe/Zurich calendar day.",
          options: { dateFormat: "DD.MM.YYYY" },
        }),
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
          title: "Promotion Text",
          type: "localizedText",
          description: "Editierbarer Promotionstext (Sanity).",
        }),
        defineField({
          name: "terms",
          title: "Terms / Highlights",
          type: "array",
          of: [
            defineArrayMember({
              type: "object",
              name: "aboPromoTerm",
              fields: [
                defineField({
                  name: "label",
                  title: "Term",
                  type: "localizedString",
                  validation: (Rule) => Rule.required(),
                }),
              ],
              preview: {
                select: { title: "label.de" },
                prepare({ title }) {
                  return { title: title || "Term" };
                },
              },
            }),
          ],
        }),
        defineField({
          name: "cta",
          title: "Contact CTA",
          type: "ctaField",
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
