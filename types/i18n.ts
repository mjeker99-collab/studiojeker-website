export const locales = ["de", "en"] as const;

export type Locale = (typeof locales)[number];

export type Dictionary = {
  brand: {
    name: string;
    claim: string;
    positioning: string;
  };
  nav: {
    solutions: string;
    references: string;
    about: string;
    contact: string;
    cta: string;
    openMenu: string;
    closeMenu: string;
    primaryNav: string;
    language: string;
  };
  footer: {
    navigation: string;
    services: string;
    legal: string;
    copyright: string;
  };
  foundation: {
    title: string;
    intro: string;
    statusLabel: string;
    localeLabel: string;
    cards: Array<{
      title: string;
      body: string;
    }>;
  };
};
