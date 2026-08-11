import type { Locale } from "@/types/i18n";
import { localizePathname } from "@/lib/i18n/config";

/**
 * Public contact details verified from the live studiojeker.ch contact page.
 * Do not invent alternate emails, phones or addresses.
 */
export const studiojekerContact = {
  company: "Studiojeker GmbH",
  street: "Hauptstrasse 73",
  postalCode: "4528",
  city: "Zuchwil",
  country: "Switzerland",
  email: "mail@studiojeker.ch",
  phoneDisplay: "+41 (0)32 623 45 42",
  phoneTel: "+41326234542",
  websiteDisplay: "studiojeker.ch",
  websiteHref: "https://www.studiojeker.ch",
  /** Maps search for the verified studio address (no invented place-id). */
  mapsHref:
    "https://www.google.com/maps/search/?api=1&query=Hauptstrasse+73%2C+4528+Zuchwil",
} as const;

export type ContactPageContent = {
  seo: { title: string; description: string };
  label: string;
  headlineBefore: string;
  headlineAccent: string;
  headlineAfter: string;
  subheadline: string;
  heroCtaLabel: string;
  form: {
    id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    message: string;
    submit: string;
    privacyNote: string;
    privacyLinkLabel: string;
    success: string;
    error: string;
    sending: string;
  };
  details: {
    addressLabel: string;
    phoneLabel: string;
    emailLabel: string;
  };
  secondary: {
    label: string;
    headline: string;
    text: string;
    ctaLabel: string;
  };
  finalCta: {
    headlineBefore: string;
    headlineAccent: string;
    headlineAfter: string;
    text: string;
    ctaLabel: string;
  };
  privacyHref: string;
};

export function getContactPageContent(locale: Locale): ContactPageContent {
  const privacyHref = localizePathname("/datenschutz", locale);

  if (locale === "en") {
    return {
      seo: {
        title: "Contact Studiojeker | Let's Create Visibility Together",
        description:
          "Get in touch with Studiojeker to discuss photography, film, 3D visualization and strategic marketing for your business.",
      },
      label: "Contact",
      headlineBefore: "Let's create ",
      headlineAccent: "visibility",
      headlineAfter: " together.",
      subheadline:
        "Tell us about your project. We look forward to hearing from you.",
      heroCtaLabel: "Go to form",
      form: {
        id: "contact-form",
        name: "Your name",
        company: "Company",
        email: "Email",
        phone: "Phone",
        message: "Message",
        submit: "Send message",
        privacyNote: "By sending this form you accept our",
        privacyLinkLabel: "privacy policy",
        success: "Thank you. Your message has been sent.",
        error: "Something went wrong. Please try again later.",
        sending: "Sending…",
      },
      details: {
        addressLabel: "Address",
        phoneLabel: "Phone",
        emailLabel: "Email",
      },
      secondary: {
        label: "Let's talk",
        headline: "Your project deserves a strong result.",
        text: "Whether a first conversation or a concrete brief — we are here.",
        ctaLabel: "Go to form",
      },
      finalCta: {
        headlineBefore: "Let's create ",
        headlineAccent: "visibility",
        headlineAfter: " together.",
        text: "We look forward to your project.",
        ctaLabel: "Go to form",
      },
      privacyHref,
    };
  }

  return {
    seo: {
      title: "Kontakt Studiojeker | Let's Create Visibility Together",
      description:
        "Kontaktieren Sie Studiojeker für Fotografie, Film, 3D-Visualisierung und strategisches Marketing.",
    },
    label: "Kontakt",
    headlineBefore: "Lassen Sie uns gemeinsam ",
    headlineAccent: "Sichtbarkeit",
    headlineAfter: " schaffen.",
    subheadline:
      "Wir freuen uns auf Ihr Projekt. Nehmen Sie Kontakt mit uns auf.",
    heroCtaLabel: "Zum Formular",
    form: {
      id: "contact-form",
      name: "Ihr Name",
      company: "Firma",
      email: "E-Mail",
      phone: "Telefon",
      message: "Nachricht",
      submit: "Nachricht senden",
      privacyNote: "Mit dem Absenden akzeptieren Sie unsere",
      privacyLinkLabel: "Datenschutzerklärung",
      success: "Vielen Dank. Ihre Nachricht wurde gesendet.",
      error: "Etwas ist schiefgelaufen. Bitte versuchen Sie es später erneut.",
      sending: "Wird gesendet…",
    },
    details: {
      addressLabel: "Adresse",
      phoneLabel: "Telefon",
      emailLabel: "E-Mail",
    },
    secondary: {
      label: "Lassen Sie uns reden",
      headline: "Ihr Projekt verdient ein starkes Ergebnis.",
      text: "Ob erstes Kennenlernen oder konkrete Anfrage – wir sind für Sie da.",
      ctaLabel: "Zum Formular",
    },
    finalCta: {
      headlineBefore: "Lassen Sie uns gemeinsam ",
      headlineAccent: "Sichtbarkeit",
      headlineAfter: " schaffen.",
      text: "Wir freuen uns auf Ihr Projekt.",
      ctaLabel: "Zum Formular",
    },
    privacyHref,
  };
}
