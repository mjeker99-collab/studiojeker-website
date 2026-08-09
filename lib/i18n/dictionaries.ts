import type { Dictionary, Locale } from "@/types/i18n";

/**
 * Structural UI strings only.
 * Marketing/page content must come from WordPress later.
 * Labels follow Developer Kit IA / approved source CTAs.
 */
const dictionaries: Record<Locale, Dictionary> = {
  de: {
    brand: {
      name: "Studiojeker",
      claim: "We Create Visibility.",
      positioning: "Visual Content & Marketing for Businesses",
    },
    nav: {
      about: "About",
      services: "Services",
      work: "Work",
      insights: "Insights",
      contact: "Contact",
      cta: "Projekt besprechen",
      openMenu: "Menü öffnen",
      closeMenu: "Menü schliessen",
      primaryNav: "Hauptnavigation",
      language: "Sprache",
    },
    footer: {
      navigation: "Navigation",
      services: "Services",
      legal: "Rechtliches",
      copyright: "© Studiojeker",
    },
    foundation: {
      title: "Next.js Foundation",
      intro:
        "Strukturelle Basis für Frontend, Design-System, DE/EN-Routing und WordPress-Anbindung. Keine finalen Seiteninhalte in dieser Phase.",
      statusLabel: "Phase 1",
      localeLabel: "Deutsch",
      cards: [
        {
          title: "Design Tokens",
          body: "Farben, Typografie, Abstände und Container gemäss Developer Kit.",
        },
        {
          title: "Layout Shell",
          body: "Header, Navigation und Footer als strukturelle Komponenten.",
        },
        {
          title: "WordPress Ready",
          body: "REST-Client und Content-Typen vorbereitet, ohne Live-Abhängigkeit.",
        },
        {
          title: "DE / EN Routing",
          body: "Deutsch unter `/`, Englisch unter `/en/`, Polylang-kompatibel.",
        },
      ],
    },
  },
  en: {
    brand: {
      name: "Studiojeker",
      claim: "We Create Visibility.",
      positioning: "Visual Content & Marketing for Businesses",
    },
    nav: {
      about: "About",
      services: "Services",
      work: "Work",
      insights: "Insights",
      contact: "Contact",
      cta: "Let's Talk",
      openMenu: "Open menu",
      closeMenu: "Close menu",
      primaryNav: "Primary navigation",
      language: "Language",
    },
    footer: {
      navigation: "Navigation",
      services: "Services",
      legal: "Legal",
      copyright: "© Studiojeker",
    },
    foundation: {
      title: "Next.js Foundation",
      intro:
        "Structural foundation for frontend, design system, DE/EN routing and WordPress integration. No final page content in this phase.",
      statusLabel: "Phase 1",
      localeLabel: "English",
      cards: [
        {
          title: "Design Tokens",
          body: "Colors, typography, spacing and containers per the Developer Kit.",
        },
        {
          title: "Layout Shell",
          body: "Header, navigation and footer as structural components.",
        },
        {
          title: "WordPress Ready",
          body: "REST client and content types prepared without a live dependency.",
        },
        {
          title: "DE / EN Routing",
          body: "German at `/`, English at `/en/`, compatible with Polylang.",
        },
      ],
    },
  },
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
