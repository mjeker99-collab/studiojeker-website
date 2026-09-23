import type { Locale } from "@/types/i18n";
import type { HomepageClientLogo, HomepageMedia } from "@/types/homepage";
import { getClientLogos } from "@/lib/content/clients";
import { getAiPath, localizePathname } from "@/lib/i18n/config";

export type AiApplicationItem = {
  id: string;
  number: string;
  title: string;
  description: string;
};

export type AiProcessStep = {
  id: string;
  title: string;
  description: string;
};

export type AiTextBlock = {
  headline: string;
  body: string[];
  media?: HomepageMedia;
  videoId?: string;
  /** Optional editor caption under the section media. */
  caption?: string;
};

/** Optional 16:9 landscape break — Sanity mediaField (image or Vimeo). */
export type AiLandscapeBreak = {
  media?: HomepageMedia;
  videoId?: string;
  caption?: string;
};

export type AiPageContent = {
  seo: {
    title: string;
    description: string;
    ogImagePath?: string;
  };
  hero: {
    label: string;
    headline: string;
    body: string;
    media: HomepageMedia;
    videoId?: string;
  };
  intro: AiTextBlock;
  process: {
    label: string;
    headline: string;
    introduction: string;
    steps: AiProcessStep[];
  };
  showreel: {
    label: string;
    headline: string;
    body: string;
    cta: { label: string; href: string };
    media: HomepageMedia;
    videoId?: string;
  };
  applications: {
    headline: string;
    items: AiApplicationItem[];
    media?: HomepageMedia;
    videoId?: string;
    caption?: string;
  };
  models: AiTextBlock;
  experience: AiTextBlock;
  approach: AiTextBlock;
  /**
   * Optional stills from the KI showreel (Sanity uploads).
   * Omitted/empty until published — page never invents placeholder art.
   */
  visuals: {
    keyVisual?: HomepageMedia;
    clayVilla?: HomepageMedia;
    photoVilla?: HomepageMedia;
    contentFormats?: HomepageMedia;
    distributionChannels?: HomepageMedia;
  };
  /**
   * Optional 16:9 landscape breaks between process steps / text blocks.
   * Empty slots collapse — Sanity only, no static fallbacks.
   */
  landscapeBreaks: {
    afterAi?: AiLandscapeBreak;
    afterDistribution?: AiLandscapeBreak;
    afterVisibility?: AiLandscapeBreak;
    midApplications?: AiLandscapeBreak;
    afterApplications?: AiLandscapeBreak;
    afterModels?: AiLandscapeBreak;
    afterExperience?: AiLandscapeBreak;
  };
  clients: {
    label: string;
    logos: HomepageClientLogo[];
  };
  closing: {
    headline: string;
    text: string;
    cta: { label: string; href: string };
  };
};

export { getAiPath };

/** Canonical path pair for hreflang / language switcher. */
export const aiLanguageAlternates = {
  de: getAiPath("de"),
  en: getAiPath("en"),
} as const;

const EMPTY_MEDIA: HomepageMedia = {
  src: "",
  alt: "",
  width: 1920,
  height: 1080,
};

/**
 * Empty structural shell for the KI / AI page.
 * Runtime content must come from Sanity (`mergeSanityAi`).
 * No editorial copy and no static image paths.
 */
export function getEmptyAiPageContent(locale: Locale): AiPageContent {
  const contact = localizePathname("/contact", locale);
  const logos = getClientLogos();

  return {
    seo: {
      title: "",
      description: "",
    },
    hero: {
      label: "",
      headline: "",
      body: "",
      media: { ...EMPTY_MEDIA },
      videoId: "",
    },
    intro: {
      headline: "",
      body: [],
    },
    process: {
      label: "",
      headline: "",
      introduction: "",
      steps: [],
    },
    showreel: {
      label: "",
      headline: "",
      body: "",
      cta: { label: "", href: contact },
      media: { ...EMPTY_MEDIA },
      videoId: "",
    },
    applications: {
      headline: "",
      items: [],
    },
    models: {
      headline: "",
      body: [],
    },
    experience: {
      headline: "",
      body: [],
    },
    approach: {
      headline: "",
      body: [],
    },
    visuals: {},
    landscapeBreaks: {},
    clients: {
      label: "",
      logos,
    },
    closing: {
      headline: "",
      text: "",
      cta: { label: "", href: contact },
    },
  };
}
