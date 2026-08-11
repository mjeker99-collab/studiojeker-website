export const locales = ["de", "en"] as const;

export type Locale = (typeof locales)[number];

export type Dictionary = {
  brand: {
    name: string;
    claim: string;
    positioning: string;
  };
  nav: {
    about: string;
    services: string;
    work: string;
    insights: string;
    contact: string;
    cta: string;
    openMenu: string;
    closeMenu: string;
    primaryNav: string;
    language: string;
  };
  footer: {
    brand: string;
    navigation: string;
    services: string;
    legal: string;
    copyright: string;
    impressum: string;
    privacy: string;
    architecture: string;
    productCommunication: string;
    businessCommunication: string;
    digitalMarketing: string;
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
