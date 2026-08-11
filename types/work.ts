export type ProjectMediaImage = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

/**
 * Work tile media — switch `type` without changing tile dimensions.
 * Central content can later set image | video | slideshow per project.
 */
export type ProjectMedia =
  | {
      type: "image";
      src: string;
      alt: string;
      width?: number;
      height?: number;
    }
  | {
      type: "video";
      /** Local MP4 path, Vimeo numeric id, or Vimeo URL */
      src: string;
      poster: string;
      posterAlt?: string;
      duration?: string;
      provider?: "local" | "vimeo";
    }
  | {
      type: "slideshow";
      images: ProjectMediaImage[];
      /** Auto-advance interval in ms (default 4500). */
      interval?: number;
    };

export type WorkProjectItem = {
  id: string;
  /** Accessible label only — no invented client/project names in UI. */
  title: string;
  /** Optional deep link (typically category service page). Image tiles only. */
  href?: string;
  media: ProjectMedia;
};

export type WorkCategory = {
  id: string;
  title: string;
  href: string;
  items: WorkProjectItem[];
};

export type WorkPageContent = {
  seo: { title: string; description: string };
  hero: {
    label: string;
    headline: string;
    text: string;
  };
  categories: WorkCategory[];
  finalCta: {
    headlineBefore: string;
    headlineAccent: string;
    headlineAfter: string;
    text: string;
    cta: { label: string; href: string };
  };
};
