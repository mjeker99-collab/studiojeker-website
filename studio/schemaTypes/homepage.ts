import { defineArrayMember, defineField, defineType } from "sanity";
import { seoFields } from "./shared";

/**
 * Homepage — singleton editorial content.
 *
 * Fields are flat and grouped by section tabs for clear Studio UX.
 * Nested section objects (heroSection, …) remain as Legacy for migration fallback.
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
    // Hero — media first so editors see the image immediately
    // -------------------------------------------------------------------------
    defineField({
      name: "heroMedia",
      title: "Hero Medium",
      type: "mediaField",
      group: "hero",
      description: "Primary image or Vimeo video for the hero area.",
    }),
    defineField({
      name: "heroEyebrow",
      title: "Eyebrow / Label (optional)",
      type: "localizedString",
      group: "hero",
    }),
    defineField({
      name: "heroHeadlineLocalized",
      title: "Headline",
      type: "localizedString",
      group: "hero",
      description: "Main hero headline.",
    }),
    defineField({
      name: "heroSubheadline",
      title: "Subheadline",
      type: "localizedString",
      group: "hero",
      description: "Service terms line below the headline.",
    }),
    defineField({
      name: "heroIntro",
      title: "Intro Text",
      type: "localizedText",
      group: "hero",
      description: "Supporting paragraph(s) below the subheadline.",
    }),
    defineField({
      name: "heroPrimaryCta",
      title: "Primary CTA",
      type: "ctaField",
      group: "hero",
    }),

    // -------------------------------------------------------------------------
    // Services
    // -------------------------------------------------------------------------
    defineField({
      name: "servicesLabel",
      title: "Section Label",
      type: "localizedString",
      group: "services",
    }),
    defineField({
      name: "servicesHeadline",
      title: "Headline",
      type: "localizedString",
      group: "services",
    }),
    defineField({
      name: "servicesItems",
      title: "Service Areas",
      type: "array",
      group: "services",
      of: [defineArrayMember({ type: "homepageServiceItem" })],
      validation: (Rule) => Rule.max(4),
    }),

    // -------------------------------------------------------------------------
    // Showreel
    // -------------------------------------------------------------------------
    defineField({
      name: "showreelMedia",
      title: "Showreel Video",
      type: "mediaField",
      group: "showreel",
      description: "Vimeo video with poster image.",
    }),
    defineField({
      name: "showreelLabel",
      title: "Section Label",
      type: "localizedString",
      group: "showreel",
    }),
    defineField({
      name: "showreelHeadline",
      title: "Headline",
      type: "localizedString",
      group: "showreel",
    }),
    defineField({
      name: "showreelText",
      title: "Text",
      type: "localizedText",
      group: "showreel",
    }),
    defineField({
      name: "showreelCta",
      title: "CTA (optional)",
      type: "ctaField",
      group: "showreel",
    }),

    // -------------------------------------------------------------------------
    // Projects
    // -------------------------------------------------------------------------
    defineField({
      name: "projectsLabel",
      title: "Section Label",
      type: "localizedString",
      group: "projects",
    }),
    defineField({
      name: "projectsHeadline",
      title: "Headline",
      type: "localizedString",
      group: "projects",
    }),
    defineField({
      name: "projectsIntro",
      title: "Intro Text (optional)",
      type: "localizedText",
      group: "projects",
    }),
    defineField({
      name: "projectsViewAllCta",
      title: "View All CTA",
      type: "ctaField",
      group: "projects",
    }),
    defineField({
      name: "selectedProjects",
      title: "Selected Projects",
      type: "array",
      group: "projects",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "project" }],
        }),
      ],
      description:
        "Pick featured projects from the Work library. Leave empty to show default placeholders.",
    }),

    // -------------------------------------------------------------------------
    // Sichtbarkeit im Abo
    // -------------------------------------------------------------------------
    defineField({
      name: "aboMedia",
      title: "Image or Video",
      type: "mediaField",
      group: "abo",
    }),
    defineField({
      name: "aboLabel",
      title: "Section Label",
      type: "localizedString",
      group: "abo",
      description: "Short label shown above the headline.",
    }),
    defineField({
      name: "aboHeadline",
      title: "Headline",
      type: "localizedString",
      group: "abo",
    }),
    defineField({
      name: "aboText",
      title: "Text",
      type: "localizedText",
      group: "abo",
    }),
    defineField({
      name: "aboBenefits",
      title: "Benefits",
      type: "array",
      group: "abo",
      of: [defineArrayMember({ type: "homepageBenefitItem" })],
    }),
    defineField({
      name: "aboCta",
      title: "CTA",
      type: "ctaField",
      group: "abo",
    }),

    // -------------------------------------------------------------------------
    // Studiojeker / About
    // -------------------------------------------------------------------------
    defineField({
      name: "aboutMedia",
      title: "Image or Video",
      type: "mediaField",
      group: "about",
    }),
    defineField({
      name: "aboutLabel",
      title: "Section Label",
      type: "localizedString",
      group: "about",
    }),
    defineField({
      name: "aboutHeadline",
      title: "Headline",
      type: "localizedString",
      group: "about",
    }),
    defineField({
      name: "aboutSubheadline",
      title: "Subheadline (optional)",
      type: "localizedString",
      group: "about",
    }),
    defineField({
      name: "aboutText",
      title: "Text",
      type: "localizedText",
      group: "about",
    }),
    defineField({
      name: "aboutCta",
      title: "CTA",
      type: "ctaField",
      group: "about",
    }),

    // -------------------------------------------------------------------------
    // Clients
    // -------------------------------------------------------------------------
    defineField({
      name: "clientsLabel",
      title: "Section Label",
      type: "localizedString",
      group: "clients",
    }),
    defineField({
      name: "clientsLogos",
      title: "Client Logos",
      type: "array",
      group: "clients",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "client" }],
        }),
      ],
      description:
        "Select and order client logos. Manage logos under Clients / Logos.",
    }),

    // -------------------------------------------------------------------------
    // Final CTA
    // -------------------------------------------------------------------------
    defineField({
      name: "finalCtaHeadline",
      title: "Headline",
      type: "localizedString",
      group: "finalCta",
      description:
        "Full headline. The accent word (e.g. Sichtbarkeit / visibility) is styled automatically.",
    }),
    defineField({
      name: "finalCtaText",
      title: "Text (optional)",
      type: "localizedText",
      group: "finalCta",
    }),
    defineField({
      name: "finalCtaButton",
      title: "Button",
      type: "ctaField",
      group: "finalCta",
    }),

    // -------------------------------------------------------------------------
    // SEO
    // -------------------------------------------------------------------------
    defineField({
      name: "seoMetaTitle",
      title: "SEO Title",
      type: "localizedString",
      group: "seo",
    }),
    defineField({
      name: "seoMetaDescription",
      title: "Meta Description",
      type: "localizedText",
      group: "seo",
    }),
    defineField({
      name: "seoOgImage",
      title: "Open Graph / Social Sharing Image",
      type: "image",
      group: "seo",
      options: { hotspot: true },
      description: "Recommended 1200 × 630 px.",
    }),

    // -------------------------------------------------------------------------
    // Legacy — keep for backward compatibility; hide from day-to-day editing
    // -------------------------------------------------------------------------
    defineField({
      name: "heroHeadline",
      title: "Hero Headline (legacy DE)",
      type: "string",
      group: "legacy",
      hidden: true,
    }),
    defineField({
      name: "introText",
      title: "Hero Intro Text (legacy DE)",
      type: "text",
      rows: 4,
      group: "legacy",
      hidden: true,
    }),
    defineField({
      name: "heroImage",
      title: "Hero Image (legacy)",
      type: "image",
      group: "legacy",
      options: { hotspot: true },
      hidden: true,
    }),
    defineField({
      name: "heroVideoUrl",
      title: "Hero Video URL (legacy)",
      type: "url",
      group: "legacy",
      hidden: true,
    }),
    defineField({
      name: "mainIntroHeadline",
      title: "About Headline (legacy DE)",
      type: "string",
      group: "legacy",
      hidden: true,
    }),
    defineField({
      name: "mainIntroText",
      title: "About Text (legacy DE)",
      type: "text",
      rows: 5,
      group: "legacy",
      hidden: true,
    }),
    defineField({
      name: "servicesSectionHeadline",
      title: "Services Headline (legacy DE)",
      type: "string",
      group: "legacy",
      hidden: true,
    }),
    defineField({
      name: "servicesIntro",
      title: "Services Intro (legacy DE)",
      type: "text",
      rows: 3,
      group: "legacy",
      hidden: true,
    }),
    defineField({
      name: "workSectionHeadline",
      title: "Projects Headline (legacy DE)",
      type: "string",
      group: "legacy",
      hidden: true,
    }),
    defineField({
      name: "workIntro",
      title: "Projects Intro (legacy DE)",
      type: "text",
      rows: 3,
      group: "legacy",
      hidden: true,
    }),
    defineField({
      name: "ctaHeadline",
      title: "Final CTA Headline (legacy DE)",
      type: "string",
      group: "legacy",
      hidden: true,
    }),
    defineField({
      name: "ctaText",
      title: "Final CTA Text (legacy DE)",
      type: "text",
      rows: 3,
      group: "legacy",
      hidden: true,
    }),
    defineField({
      name: "ctaLabel",
      title: "Final CTA Label (legacy DE)",
      type: "string",
      group: "legacy",
      hidden: true,
    }),
    ...seoFields.map((field) => ({
      ...field,
      group: "legacy" as const,
      hidden: true,
    })),

    // Nested section snapshots from the first migration (read fallback only)
    defineField({
      name: "heroSection",
      title: "Hero (nested legacy)",
      type: "object",
      group: "legacy",
      hidden: true,
      fields: [
        defineField({ name: "eyebrow", type: "localizedString" }),
        defineField({ name: "headline", type: "localizedString" }),
        defineField({ name: "subheadline", type: "localizedString" }),
        defineField({ name: "intro", type: "localizedText" }),
        defineField({ name: "primaryCta", type: "ctaField" }),
        defineField({ name: "media", type: "mediaField" }),
      ],
    }),
    defineField({
      name: "servicesSection",
      title: "Services (nested legacy)",
      type: "object",
      group: "legacy",
      hidden: true,
      fields: [
        defineField({ name: "label", type: "localizedString" }),
        defineField({ name: "headline", type: "localizedString" }),
        defineField({
          name: "items",
          type: "array",
          of: [defineArrayMember({ type: "homepageServiceItem" })],
        }),
      ],
    }),
    defineField({
      name: "showreelSection",
      title: "Showreel (nested legacy)",
      type: "object",
      group: "legacy",
      hidden: true,
      fields: [
        defineField({ name: "label", type: "localizedString" }),
        defineField({ name: "headline", type: "localizedString" }),
        defineField({ name: "text", type: "localizedText" }),
        defineField({ name: "cta", type: "ctaField" }),
        defineField({ name: "media", type: "mediaField" }),
      ],
    }),
    defineField({
      name: "projectsSection",
      title: "Projects (nested legacy)",
      type: "object",
      group: "legacy",
      hidden: true,
      fields: [
        defineField({ name: "label", type: "localizedString" }),
        defineField({ name: "headline", type: "localizedString" }),
        defineField({ name: "intro", type: "localizedText" }),
        defineField({ name: "viewAllCta", type: "ctaField" }),
        defineField({
          name: "selectedProjects",
          type: "array",
          of: [
            defineArrayMember({
              type: "reference",
              to: [{ type: "project" }],
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: "aboSection",
      title: "Abo (nested legacy)",
      type: "object",
      group: "legacy",
      hidden: true,
      fields: [
        defineField({ name: "label", type: "localizedString" }),
        defineField({ name: "headline", type: "localizedString" }),
        defineField({ name: "text", type: "localizedText" }),
        defineField({
          name: "benefits",
          type: "array",
          of: [defineArrayMember({ type: "homepageBenefitItem" })],
        }),
        defineField({ name: "cta", type: "ctaField" }),
        defineField({ name: "media", type: "mediaField" }),
      ],
    }),
    defineField({
      name: "aboutSection",
      title: "About (nested legacy)",
      type: "object",
      group: "legacy",
      hidden: true,
      fields: [
        defineField({ name: "label", type: "localizedString" }),
        defineField({ name: "headline", type: "localizedString" }),
        defineField({ name: "subheadline", type: "localizedString" }),
        defineField({ name: "text", type: "localizedText" }),
        defineField({ name: "cta", type: "ctaField" }),
        defineField({ name: "media", type: "mediaField" }),
      ],
    }),
    defineField({
      name: "clientsSection",
      title: "Clients (nested legacy)",
      type: "object",
      group: "legacy",
      hidden: true,
      fields: [
        defineField({ name: "label", type: "localizedString" }),
        defineField({
          name: "logos",
          type: "array",
          of: [
            defineArrayMember({
              type: "reference",
              to: [{ type: "client" }],
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: "finalCtaSection",
      title: "Final CTA (nested legacy)",
      type: "object",
      group: "legacy",
      hidden: true,
      fields: [
        defineField({ name: "headline", type: "localizedString" }),
        defineField({ name: "text", type: "localizedText" }),
        defineField({ name: "cta", type: "ctaField" }),
      ],
    }),
    defineField({
      name: "seoSection",
      title: "SEO (nested legacy)",
      type: "object",
      group: "legacy",
      hidden: true,
      fields: [
        defineField({ name: "title", type: "localizedString" }),
        defineField({ name: "description", type: "localizedText" }),
        defineField({ name: "ogImage", type: "image", options: { hotspot: true } }),
      ],
    }),
  ],
  preview: {
    select: {
      title: "heroHeadlineLocalized.de",
      legacyTitle: "heroHeadline",
      media: "heroMedia.image",
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
