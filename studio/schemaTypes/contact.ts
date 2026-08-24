import { defineArrayMember, defineField, defineType } from "sanity";
import { editorialColorField } from "./shared";

/**
 * Contact page — singleton editorial content for /contact and /en/contact.
 * Company address / phone / email stay in Global Settings (or the verified
 * frontend fallback). Design stays in Next.js.
 */
export const contact = defineType({
  name: "contact",
  title: "Contact",
  type: "document",
  groups: [
    { name: "hero", title: "Hero", default: true },
    { name: "content", title: "Contact Content" },
    { name: "form", title: "Form Labels" },
    { name: "clients", title: "Clients / Logos" },
    { name: "cta", title: "Final CTA" },
    { name: "seo", title: "SEO" },
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
          name: "label",
          title: "Hero Label",
          type: "localizedString",
          description: "Small label above the headline (e.g. Kontakt / Contact).",
        }),
        defineField({
          name: "headline",
          title: "Hero Headline",
          type: "localizedString",
          description:
            "Full headline text. Use Highlight Text below to mark the word styled in cyan.",
        }),
        defineField({
          name: "headlineHighlightText",
          title: "Highlight Text",
          type: "localizedString",
          description:
            "Word or phrase inside the headline to emphasize in cyan (e.g. Sichtbarkeit / visibility). Must match the headline exactly.",
        }),
        editorialColorField(
          "headlineColor",
          "Headline Color",
          "Color for the main headline text. Default keeps the current black.",
        ),
        editorialColorField(
          "headlineHighlightColor",
          "Highlight Color",
          "Color for the highlighted word in the headline. Default keeps the Studiojeker cyan accent.",
        ),
        defineField({
          name: "subheadline",
          title: "Hero Description",
          type: "localizedText",
          description: "Supporting text under the headline.",
        }),
        editorialColorField(
          "subheadlineColor",
          "Subheadline Color",
          "Color for the description under the headline. Default keeps the current black.",
        ),
        defineField({
          name: "ctaLabel",
          title: "Hero CTA Label",
          type: "localizedString",
          description: "Button that scrolls to the contact form (e.g. Zum Formular).",
        }),
        defineField({
          name: "media",
          title: "Contact Hero Image",
          type: "mediaField",
          description:
            "Main image beside the Contact headline. Prefer Image. Video (Vimeo) is optional.",
        }),
      ],
    }),

    // -------------------------------------------------------------------------
    // Contact content (details labels + secondary block)
    // -------------------------------------------------------------------------
    defineField({
      name: "detailsSection",
      title: "Contact Details Labels",
      type: "object",
      group: "content",
      options: { collapsible: true },
      description:
        "Labels only. Company name, address, phone and email come from Global Settings / verified site data — not duplicated here.",
      fields: [
        defineField({
          name: "addressLabel",
          title: "Address Label",
          type: "localizedString",
        }),
        defineField({
          name: "phoneLabel",
          title: "Phone Label",
          type: "localizedString",
        }),
        defineField({
          name: "emailLabel",
          title: "Email Label",
          type: "localizedString",
        }),
      ],
    }),

    defineField({
      name: "secondarySection",
      title: "Secondary Content Block",
      type: "object",
      group: "content",
      options: { collapsible: true },
      fields: [
        defineField({
          name: "label",
          title: "Section Label",
          type: "localizedString",
        }),
        defineField({
          name: "headline",
          title: "Section Headline",
          type: "localizedString",
        }),
        defineField({
          name: "text",
          title: "Section Text",
          type: "localizedText",
        }),
        defineField({
          name: "ctaLabel",
          title: "CTA Label",
          type: "localizedString",
          description: "Button that scrolls to the contact form.",
        }),
      ],
    }),

    // -------------------------------------------------------------------------
    // Form labels (UI copy — not company contact data)
    // -------------------------------------------------------------------------
    defineField({
      name: "formSection",
      title: "Form Labels",
      type: "object",
      group: "form",
      options: { collapsible: true },
      description: "Field labels and messages shown on the Contact form.",
      fields: [
        defineField({
          name: "nameLabel",
          title: "Name Field Label",
          type: "localizedString",
        }),
        defineField({
          name: "companyLabel",
          title: "Company Field Label",
          type: "localizedString",
        }),
        defineField({
          name: "emailLabel",
          title: "Email Field Label",
          type: "localizedString",
        }),
        defineField({
          name: "phoneLabel",
          title: "Phone Field Label",
          type: "localizedString",
        }),
        defineField({
          name: "messageLabel",
          title: "Message Field Label",
          type: "localizedString",
        }),
        defineField({
          name: "submitLabel",
          title: "Submit Button Label",
          type: "localizedString",
        }),
        defineField({
          name: "privacyNote",
          title: "Privacy Note",
          type: "localizedString",
          description: "Text before the privacy policy link.",
        }),
        defineField({
          name: "privacyLinkLabel",
          title: "Privacy Link Label",
          type: "localizedString",
        }),
        defineField({
          name: "successMessage",
          title: "Success Message",
          type: "localizedString",
        }),
        defineField({
          name: "errorMessage",
          title: "Error Message",
          type: "localizedString",
        }),
        defineField({
          name: "sendingMessage",
          title: "Sending Message",
          type: "localizedString",
        }),
      ],
    }),

    // -------------------------------------------------------------------------
    // Clients
    // -------------------------------------------------------------------------
    defineField({
      name: "clientsSection",
      title: "Clients / Logos",
      type: "object",
      group: "clients",
      options: { collapsible: true },
      description:
        "Section label only. Logos come from every Enabled Client / Logo document (sortOrder). No quantity limit.",
      fields: [
        defineField({
          name: "label",
          title: "Clients Label",
          type: "localizedString",
        }),
        defineField({
          name: "logos",
          title: "[Deprecated] Client Logos selection",
          type: "array",
          hidden: true,
          readOnly: true,
          of: [
            defineArrayMember({
              type: "reference",
              to: [{ type: "client" }],
            }),
          ],
          description:
            "Deprecated. The live site loads every Enabled Client / Logo document (ordered by sortOrder). Same uncapped library as the Homepage.",
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
      group: "cta",
      options: { collapsible: true },
      fields: [
        defineField({
          name: "headline",
          title: "Final CTA Headline",
          type: "localizedString",
          description:
            "Full headline. The accent word (Sichtbarkeit / visibility) is styled automatically.",
        }),
        defineField({
          name: "text",
          title: "Final CTA Description",
          type: "localizedText",
        }),
        defineField({
          name: "ctaLabel",
          title: "Final CTA Button Label",
          type: "localizedString",
          description: "Button that scrolls to the contact form.",
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
  ],
  preview: {
    select: {
      title: "heroSection.headline.de",
      titleEn: "heroSection.headline.en",
    },
    prepare({ title, titleEn }) {
      return {
        title: "Contact",
        subtitle: title || titleEn || "Contact page",
      };
    },
  },
});
