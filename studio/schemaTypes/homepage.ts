import { defineArrayMember, defineField, defineType } from "sanity";
import { seoFields } from "./shared";

/**
 * Temporary root-level flat fields from post–PR #41 Studio experiments.
 * Production still stores these alongside nested sections. Hidden + read-only
 * so editors only use the nested canonical model, while Studio stops reporting
 * “Unknown fields found”. Do not delete from the dataset until a separate
 * migration is approved.
 */
function deprecatedFlatField(
  name: string,
  type: string,
  options?: {
    of?: ReturnType<typeof defineArrayMember>[];
    description?: string;
  },
) {
  return defineField({
    name,
    title: `[Deprecated · internal] ${name}`,
    type,
    ...(options?.of ? { of: options.of } : {}),
    hidden: true,
    readOnly: true,
    description:
      options?.description ??
      "Internal compatibility field from a temporary flat schema experiment. Nested section fields are canonical. Do not edit.",
  });
}

/** Flat experimental fields present on the production homepage document. */
const deprecatedFlatCompatFields = [
  deprecatedFlatField("heroMedia", "mediaField"),
  deprecatedFlatField("heroHeadlineLocalized", "localizedString"),
  deprecatedFlatField("heroSubheadline", "localizedString"),
  deprecatedFlatField("heroIntro", "localizedText"),
  deprecatedFlatField("heroPrimaryCta", "ctaField"),
  deprecatedFlatField("servicesLabel", "localizedString"),
  deprecatedFlatField("servicesHeadline", "localizedString"),
  deprecatedFlatField("servicesItems", "array", {
    of: [defineArrayMember({ type: "homepageServiceItem" })],
  }),
  deprecatedFlatField("showreelMedia", "mediaField"),
  deprecatedFlatField("showreelLabel", "localizedString"),
  deprecatedFlatField("showreelHeadline", "localizedString"),
  deprecatedFlatField("showreelText", "localizedText"),
  deprecatedFlatField("showreelCta", "ctaField"),
  deprecatedFlatField("projectsLabel", "localizedString"),
  deprecatedFlatField("projectsHeadline", "localizedString"),
  deprecatedFlatField("projectsViewAllCta", "ctaField"),
  // Root-level duplicate of projectsSection.selectedProjects
  deprecatedFlatField("selectedProjects", "array", {
    of: [
      defineArrayMember({
        type: "reference",
        to: [{ type: "project" }],
      }),
    ],
  }),
  deprecatedFlatField("aboMedia", "mediaField"),
  deprecatedFlatField("aboLabel", "localizedString"),
  deprecatedFlatField("aboHeadline", "localizedString"),
  deprecatedFlatField("aboText", "localizedText"),
  deprecatedFlatField("aboBenefits", "array", {
    of: [defineArrayMember({ type: "homepageBenefitItem" })],
  }),
  deprecatedFlatField("aboCta", "ctaField"),
  deprecatedFlatField("aboutMedia", "mediaField"),
  deprecatedFlatField("aboutLabel", "localizedString"),
  deprecatedFlatField("aboutHeadline", "localizedString"),
  deprecatedFlatField("aboutSubheadline", "localizedString"),
  deprecatedFlatField("aboutText", "localizedText"),
  deprecatedFlatField("aboutCta", "ctaField"),
  deprecatedFlatField("clientsLabel", "localizedString"),
  deprecatedFlatField("clientsLogos", "array", {
    of: [
      defineArrayMember({
        type: "reference",
        to: [{ type: "client" }],
      }),
    ],
  }),
  deprecatedFlatField("finalCtaHeadline", "localizedString"),
  deprecatedFlatField("finalCtaText", "localizedText"),
  deprecatedFlatField("finalCtaButton", "ctaField"),
  deprecatedFlatField("seoMetaTitle", "localizedString"),
  deprecatedFlatField("seoMetaDescription", "localizedText"),
];

/**
 * Homepage — singleton editorial content for the marketing homepage.
 *
 * Canonical model: nested section fields (heroSection, …).
 * Legacy root fields (heroHeadline, introText, heroImage, etc.) are preserved
 * for backward compatibility. Flat experimental root fields are hidden
 * compatibility stubs only — do not present them as the editor UI.
 */
export const homepage = defineType({
  name: "homepage",
  title: "Homepage",
  type: "document",
  groups: [
    { name: "hero", title: "Hero", default: true },
    { name: "services", title: "Services" },
    { name: "showreel", title: "Intro / Showreel" },
    { name: "projects", title: "Work / Projects" },
    { name: "abo", title: "Sichtbarkeit im Abo" },
    { name: "about", title: "About teaser" },
    { name: "clients", title: "Clients / Logos" },
    { name: "finalCta", title: "Final CTA" },
    { name: "seo", title: "SEO" },
    { name: "legacy", title: "Legacy (DE)" },
  ],
  fields: [
    // -------------------------------------------------------------------------
    // Hero
    // -------------------------------------------------------------------------
    defineField({
      name: "heroSection",
      title: "Hero",
      type: "object",
      group: "hero",
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({
          name: "eyebrow",
          title: "Hero Label (optional)",
          type: "localizedString",
          description: "Small label above the headline. Leave empty if unused.",
        }),
        defineField({
          name: "headline",
          title: "Hero Headline",
          type: "localizedString",
          description: "Main headline (e.g. We create visibility.).",
        }),
        defineField({
          name: "subheadline",
          title: "Hero Service Line",
          type: "localizedString",
          description:
            "Secondary line under the headline (e.g. Photo. Video. 3D. …).",
        }),
        defineField({
          name: "intro",
          title: "Hero Description",
          type: "localizedText",
          description: "Supporting paragraph below the service line.",
        }),
        defineField({
          name: "primaryCta",
          title: "Hero CTA",
          type: "ctaField",
          description: "Button label and link (e.g. Unsere Arbeit ansehen).",
        }),
        defineField({
          name: "media",
          title: "Hero Media",
          type: "mediaField",
          description:
            "Choose Image or Video (Vimeo). Upload an image / poster and optional Vimeo URL.",
        }),
      ],
    }),

    // -------------------------------------------------------------------------
    // Services
    // -------------------------------------------------------------------------
    defineField({
      name: "servicesSection",
      title: "Services",
      type: "object",
      group: "services",
      options: { collapsible: true },
      fields: [
        defineField({
          name: "label",
          title: "Services Label",
          type: "localizedString",
          description: "Small section label above the services grid.",
        }),
        defineField({
          name: "headline",
          title: "Services Headline",
          type: "localizedString",
          description:
            "Accessible section headline (may be visually hidden on the site).",
        }),
        defineField({
          name: "items",
          title: "Services on Homepage",
          type: "array",
          of: [
            defineArrayMember({
              type: "reference",
              to: [{ type: "service" }],
            }),
          ],
          validation: (Rule) => Rule.max(4),
          description:
            "Select Service documents (edit card title/description on each Service). Drag to set order. Icons stay fixed in the website design.",
        }),
      ],
    }),

    // -------------------------------------------------------------------------
    // Showreel
    // -------------------------------------------------------------------------
    defineField({
      name: "showreelSection",
      title: "Intro / Showreel",
      type: "object",
      group: "showreel",
      options: { collapsible: true },
      fields: [
        defineField({
          name: "label",
          title: "Showreel Label",
          type: "localizedString",
        }),
        defineField({
          name: "headline",
          title: "Showreel Headline",
          type: "localizedString",
        }),
        defineField({
          name: "text",
          title: "Showreel Description",
          type: "localizedText",
        }),
        defineField({
          name: "cta",
          title: "Showreel CTA",
          type: "ctaField",
        }),
        defineField({
          name: "media",
          title: "Showreel Media",
          type: "mediaField",
          description:
            "Image or Vimeo video. For video, add a poster image and the Vimeo URL or ID.",
        }),
      ],
    }),

    // -------------------------------------------------------------------------
    // Projects / Work
    // -------------------------------------------------------------------------
    defineField({
      name: "projectsSection",
      title: "Work / Projects",
      type: "object",
      group: "projects",
      options: { collapsible: true },
      fields: [
        defineField({
          name: "label",
          title: "Projects Label",
          type: "localizedString",
        }),
        defineField({
          name: "headline",
          title: "Projects Headline",
          type: "localizedString",
        }),
        defineField({
          name: "intro",
          title: "Projects Intro (optional)",
          type: "localizedText",
        }),
        defineField({
          name: "viewAllCta",
          title: "View All CTA",
          type: "ctaField",
          description: "Button/link to the Work overview.",
        }),
        defineField({
          name: "selectedProjects",
          title: "Featured Projects",
          type: "array",
          of: [
            defineArrayMember({
              type: "reference",
              to: [{ type: "project" }],
            }),
          ],
          description:
            "Choose projects from Work / Projects. Drag to set order. Manage images and titles on each project.",
        }),
      ],
    }),

    // -------------------------------------------------------------------------
    // Sichtbarkeit im Abo
    // -------------------------------------------------------------------------
    defineField({
      name: "aboSection",
      title: "Sichtbarkeit im Abo",
      type: "object",
      group: "abo",
      options: { collapsible: true },
      fields: [
        defineField({
          name: "label",
          title: "Abo Label",
          type: "localizedString",
          description: "Short label in the Abo block.",
        }),
        defineField({
          name: "headline",
          title: "Abo Headline",
          type: "localizedString",
        }),
        defineField({
          name: "text",
          title: "Abo Description",
          type: "localizedText",
        }),
        defineField({
          name: "benefits",
          title: "Abo Benefits",
          type: "array",
          of: [defineArrayMember({ type: "homepageBenefitItem" })],
          description: "Benefit titles and texts. Icons are fixed in the design.",
        }),
        defineField({
          name: "cta",
          title: "Abo CTA",
          type: "ctaField",
        }),
        defineField({
          name: "media",
          title: "Abo Media",
          type: "mediaField",
          description: "Image or Vimeo video for the Abo block.",
        }),
      ],
    }),

    // -------------------------------------------------------------------------
    // Studiojeker / About teaser
    // -------------------------------------------------------------------------
    defineField({
      name: "aboutSection",
      title: "About Teaser",
      type: "object",
      group: "about",
      options: { collapsible: true },
      fields: [
        defineField({
          name: "label",
          title: "About Label",
          type: "localizedString",
        }),
        defineField({
          name: "headline",
          title: "About Headline",
          type: "localizedString",
        }),
        defineField({
          name: "subheadline",
          title: "About Subheadline (optional)",
          type: "localizedString",
        }),
        defineField({
          name: "text",
          title: "About Description",
          type: "localizedText",
        }),
        defineField({
          name: "cta",
          title: "About CTA",
          type: "ctaField",
        }),
        defineField({
          name: "media",
          title: "About Media",
          type: "mediaField",
          description: "Image or Vimeo video for the About teaser.",
        }),
      ],
    }),

    // -------------------------------------------------------------------------
    // Client logos
    // -------------------------------------------------------------------------
    defineField({
      name: "clientsSection",
      title: "Clients / Logos",
      type: "object",
      group: "clients",
      options: { collapsible: true },
      fields: [
        defineField({
          name: "label",
          title: "Clients Label",
          type: "localizedString",
        }),
        defineField({
          name: "logos",
          title: "Client Logos",
          type: "array",
          of: [
            defineArrayMember({
              type: "reference",
              to: [{ type: "client" }],
            }),
          ],
          description:
            "Select logos from Clients / Logos. Drag to set order. Inactive clients are hidden on the site.",
        }),
      ],
    }),

    // -------------------------------------------------------------------------
    // Final CTA
    // -------------------------------------------------------------------------
    defineField({
      name: "finalCtaSection",
      title: "Final CTA",
      type: "object",
      group: "finalCta",
      options: { collapsible: true },
      fields: [
        defineField({
          name: "headline",
          title: "Final CTA Headline",
          type: "localizedString",
          description:
            "Full headline. The accent word (e.g. Sichtbarkeit / visibility) is styled automatically.",
        }),
        defineField({
          name: "text",
          title: "Final CTA Description",
          type: "localizedText",
        }),
        defineField({
          name: "cta",
          title: "Final CTA Button",
          type: "ctaField",
        }),
      ],
    }),

    // -------------------------------------------------------------------------
    // SEO
    // -------------------------------------------------------------------------
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
          description: "Optional Open Graph image. Recommended 1200 × 630 px.",
        }),
      ],
    }),

    // -------------------------------------------------------------------------
    // Legacy fields — preserved for backward compatibility (existing DE content)
    // -------------------------------------------------------------------------
    defineField({
      name: "heroHeadline",
      title: "Hero Headline (legacy DE)",
      type: "string",
      group: "legacy",
      description:
        "Preserved for compatibility. Prefer Hero → Headline (German) when editing.",
      validation: (Rule) => Rule.max(120),
    }),
    defineField({
      name: "introText",
      title: "Hero Intro Text (legacy DE)",
      type: "text",
      rows: 4,
      group: "legacy",
      description:
        "Preserved for compatibility. Prefer Hero → Subheadline / Intro when editing.",
      validation: (Rule) => Rule.max(600),
    }),
    defineField({
      name: "heroImage",
      title: "Hero Image (legacy)",
      type: "image",
      group: "legacy",
      options: { hotspot: true },
      description: "Preserved for compatibility. Prefer Hero → Hero Medium.",
    }),
    defineField({
      name: "heroVideoUrl",
      title: "Hero Video URL (legacy)",
      type: "url",
      group: "legacy",
      description: "Preserved for compatibility. Prefer Hero → Hero Medium.",
      validation: (Rule) =>
        Rule.uri({ scheme: ["http", "https"], allowRelative: false }),
    }),
    defineField({
      name: "mainIntroHeadline",
      title: "About Headline (legacy DE)",
      type: "string",
      group: "legacy",
      validation: (Rule) => Rule.max(160),
    }),
    defineField({
      name: "mainIntroText",
      title: "About Text (legacy DE)",
      type: "text",
      rows: 5,
      group: "legacy",
      validation: (Rule) => Rule.max(1200),
    }),
    defineField({
      name: "servicesSectionHeadline",
      title: "Services Headline (legacy DE)",
      type: "string",
      group: "legacy",
      validation: (Rule) => Rule.max(120),
    }),
    defineField({
      name: "servicesIntro",
      title: "Services Intro (legacy DE)",
      type: "text",
      rows: 3,
      group: "legacy",
      validation: (Rule) => Rule.max(600),
    }),
    defineField({
      name: "workSectionHeadline",
      title: "Projects Headline (legacy DE)",
      type: "string",
      group: "legacy",
      validation: (Rule) => Rule.max(120),
    }),
    defineField({
      name: "workIntro",
      title: "Projects Intro (legacy DE)",
      type: "text",
      rows: 3,
      group: "legacy",
      validation: (Rule) => Rule.max(600),
    }),
    defineField({
      name: "ctaHeadline",
      title: "Final CTA Headline (legacy DE)",
      type: "string",
      group: "legacy",
      validation: (Rule) => Rule.max(160),
    }),
    defineField({
      name: "ctaText",
      title: "Final CTA Text (legacy DE)",
      type: "text",
      rows: 3,
      group: "legacy",
      validation: (Rule) => Rule.max(400),
    }),
    defineField({
      name: "ctaLabel",
      title: "Final CTA Label (legacy DE)",
      type: "string",
      group: "legacy",
      validation: (Rule) => Rule.max(60),
    }),
    ...seoFields.map((field) => ({ ...field, group: "legacy" as const })),

    // Hidden flat experimental fields — last so nested + legacy stay primary
    ...deprecatedFlatCompatFields,
  ],
  preview: {
    select: {
      title: "heroSection.headline.de",
      titleEn: "heroSection.headline.en",
      legacyTitle: "heroHeadline",
    },
    // Text-only list preview — never dereference nested media assets here.
    // Selecting heroSection.media.image previously contributed to Studio “Load failed”.
    prepare({ title, titleEn, legacyTitle }) {
      return {
        title: "Homepage",
        subtitle: title || titleEn || legacyTitle || "Studiojeker homepage",
      };
    },
  },
});