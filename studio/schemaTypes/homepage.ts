import { defineArrayMember, defineField, defineType } from "sanity";
import { seoFields } from "./shared";

/**
 * Homepage — singleton editorial content for the marketing homepage.
 *
 * Legacy root fields (heroHeadline, introText, heroImage, etc.) are preserved
 * for backward compatibility with the existing published document. New nested
 * section fields take precedence when populated.
 */
export const homepage = defineType({
  name: "homepage",
  title: "Homepage",
  type: "document",
  groups: [
    { name: "hero", title: "Hero", default: true },
    { name: "services", title: "Services" },
    { name: "showreel", title: "Showreel" },
    { name: "projects", title: "Projekte" },
    { name: "abo", title: "Sichtbarkeit im Abo" },
    { name: "about", title: "Studiojeker" },
    { name: "clients", title: "Kundenlogos" },
    { name: "finalCta", title: "Abschluss CTA" },
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
          title: "Eyebrow / Label (optional)",
          type: "localizedString",
        }),
        defineField({
          name: "headline",
          title: "Headline",
          type: "localizedString",
          description: "Main hero headline.",
        }),
        defineField({
          name: "subheadline",
          title: "Subheadline",
          type: "localizedString",
          description: "Service terms line below the headline.",
        }),
        defineField({
          name: "intro",
          title: "Intro Text",
          type: "localizedText",
          description: "Supporting paragraph(s) below the subheadline.",
        }),
        defineField({
          name: "primaryCta",
          title: "Primary CTA",
          type: "ctaField",
        }),
        defineField({
          name: "media",
          title: "Hero Medium",
          type: "mediaField",
          description: "Image or Vimeo video for the hero area.",
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
          title: "Section Label",
          type: "localizedString",
        }),
        defineField({
          name: "headline",
          title: "Headline",
          type: "localizedString",
        }),
        defineField({
          name: "items",
          title: "Service Areas",
          type: "array",
          of: [defineArrayMember({ type: "homepageServiceItem" })],
          validation: (Rule) => Rule.max(4),
        }),
      ],
    }),

    // -------------------------------------------------------------------------
    // Showreel
    // -------------------------------------------------------------------------
    defineField({
      name: "showreelSection",
      title: "Showreel",
      type: "object",
      group: "showreel",
      options: { collapsible: true },
      fields: [
        defineField({
          name: "label",
          title: "Section Label",
          type: "localizedString",
        }),
        defineField({
          name: "headline",
          title: "Headline",
          type: "localizedString",
        }),
        defineField({
          name: "text",
          title: "Text",
          type: "localizedText",
        }),
        defineField({
          name: "cta",
          title: "CTA (optional)",
          type: "ctaField",
        }),
        defineField({
          name: "media",
          title: "Showreel Video",
          type: "mediaField",
          description: "Vimeo video with poster image.",
        }),
      ],
    }),

    // -------------------------------------------------------------------------
    // Projects / Work
    // -------------------------------------------------------------------------
    defineField({
      name: "projectsSection",
      title: "Ausgewählte Projekte",
      type: "object",
      group: "projects",
      options: { collapsible: true },
      fields: [
        defineField({
          name: "label",
          title: "Section Label",
          type: "localizedString",
        }),
        defineField({
          name: "headline",
          title: "Headline",
          type: "localizedString",
        }),
        defineField({
          name: "intro",
          title: "Intro Text (optional)",
          type: "localizedText",
        }),
        defineField({
          name: "viewAllCta",
          title: "View All CTA",
          type: "ctaField",
        }),
        defineField({
          name: "selectedProjects",
          title: "Selected Projects",
          type: "array",
          of: [
            defineArrayMember({
              type: "reference",
              to: [{ type: "project" }],
            }),
          ],
          description:
            "Pick featured projects from the Work library. Leave empty to show default placeholders.",
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
          title: "Section Label",
          type: "localizedString",
          description: "Short label shown above the headline.",
        }),
        defineField({
          name: "headline",
          title: "Headline",
          type: "localizedString",
        }),
        defineField({
          name: "text",
          title: "Text",
          type: "localizedText",
        }),
        defineField({
          name: "benefits",
          title: "Benefits",
          type: "array",
          of: [defineArrayMember({ type: "homepageBenefitItem" })],
        }),
        defineField({
          name: "cta",
          title: "CTA",
          type: "ctaField",
        }),
        defineField({
          name: "media",
          title: "Image or Video",
          type: "mediaField",
        }),
      ],
    }),

    // -------------------------------------------------------------------------
    // Studiojeker / About teaser
    // -------------------------------------------------------------------------
    defineField({
      name: "aboutSection",
      title: "Studiojeker",
      type: "object",
      group: "about",
      options: { collapsible: true },
      fields: [
        defineField({
          name: "label",
          title: "Section Label",
          type: "localizedString",
        }),
        defineField({
          name: "headline",
          title: "Headline",
          type: "localizedString",
        }),
        defineField({
          name: "subheadline",
          title: "Subheadline (optional)",
          type: "localizedString",
        }),
        defineField({
          name: "text",
          title: "Text",
          type: "localizedText",
        }),
        defineField({
          name: "cta",
          title: "CTA",
          type: "ctaField",
        }),
        defineField({
          name: "media",
          title: "Image or Video",
          type: "mediaField",
        }),
      ],
    }),

    // -------------------------------------------------------------------------
    // Client logos
    // -------------------------------------------------------------------------
    defineField({
      name: "clientsSection",
      title: "Kundenlogos",
      type: "object",
      group: "clients",
      options: { collapsible: true },
      fields: [
        defineField({
          name: "label",
          title: "Section Label",
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
            "Select and order client logos. Manage logos under Clients / Logos.",
        }),
      ],
    }),

    // -------------------------------------------------------------------------
    // Final CTA
    // -------------------------------------------------------------------------
    defineField({
      name: "finalCtaSection",
      title: "Abschluss CTA",
      type: "object",
      group: "finalCta",
      options: { collapsible: true },
      fields: [
        defineField({
          name: "headline",
          title: "Headline",
          type: "localizedString",
          description:
            "Full headline. The accent word (e.g. Sichtbarkeit / visibility) is styled automatically.",
        }),
        defineField({
          name: "text",
          title: "Text (optional)",
          type: "localizedText",
        }),
        defineField({
          name: "cta",
          title: "Button",
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
          title: "Open Graph / Social Sharing Image",
          type: "image",
          options: { hotspot: true },
          description: "Recommended 1200 × 630 px.",
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
  ],
  preview: {
    select: {
      title: "heroSection.headline.de",
      legacyTitle: "heroHeadline",
      media: "heroSection.media.image",
      legacyMedia: "heroImage",
    },
    prepare({ title, legacyTitle, media, legacyMedia }) {
      return {
        title: title || legacyTitle || "Homepage",
        subtitle: "Singleton page content",
        media: media || legacyMedia,
      };
    },
  },
});
