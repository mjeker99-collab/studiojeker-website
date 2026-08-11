export type HomepageMedia = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type HomepageService = {
  id: "architecture" | "product" | "business" | "digital";
  title: string;
  description: string;
  href: string;
};

export type HomepageProject = {
  id: string;
  /**
   * Development placeholder until approved case-study content exists in WordPress.
   */
  title: string;
  category: string;
  href: string;
  image: HomepageMedia;
  isPlaceholder: boolean;
};

export type HomepageBenefit = {
  id: string;
  title: string;
  description: string;
};

export type HomepageClientLogo = {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
};

export type HomepageContent = {
  seo: {
    title: string;
    description: string;
  };
  hero: {
    headline: string;
    headlineAccent?: string;
    subheadline: string;
    body: string[];
    primaryCta: { label: string; href: string };
    secondaryCta?: { label: string; href: string };
    media: HomepageMedia;
  };
  services: {
    label: string;
    headline: string;
    items: HomepageService[];
  };
  showreel: {
    label: string;
    headline: string;
    body: string;
    cta: { label: string; href: string };
    media: HomepageMedia;
    /** Vimeo showreel video id (e.g. 1216347773). */
    videoId: string;
  };
  projects: {
    label: string;
    headline: string;
    viewAll: { label: string; href: string };
    items: HomepageProject[];
  };
  abo: {
    headline: string;
    introduction: string;
    cta: { label: string; href: string };
    benefits: HomepageBenefit[];
    media: HomepageMedia;
  };
  about: {
    label: string;
    headline: string;
    headlineAccent?: string;
    subheadline: string;
    body: string[];
    cta: { label: string; href: string };
    media: HomepageMedia;
  };
  clients: {
    label: string;
    logos: HomepageClientLogo[];
  };
  finalCta: {
    headlineBefore: string;
    headlineAccent: string;
    headlineAfter: string;
    text: string;
    cta: { label: string; href: string };
  };
};
