export type ProjectMediaImage = {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
};

/**
 * Work tile media — switch `type` without changing tile dimensions.
 * No service-page URLs. Portfolio tiles stay on /work.
 */
export type ProjectMedia =
  | {
      type: "image";
      src: string;
      alt: string;
      caption?: string;
      width?: number;
      height?: number;
    }
  | {
      type: "video";
      /** Local MP4 path, Vimeo/YouTube id or URL */
      src: string;
      poster: string;
      alt?: string;
      duration?: string;
      provider?: "local" | "vimeo" | "youtube";
      autoplay?: boolean;
      loop?: boolean;
      muted?: boolean;
    }
  | {
      type: "slideshow";
      images: ProjectMediaImage[];
      /** Shared accessible label when individual alts are placeholders. */
      alt?: string;
      /** Auto-advance interval in ms (default 4500). */
      interval?: number;
    };

export type WorkProjectItem = {
  id: string;
  /** Visible label under the tile. */
  title: string;
  /** Optional media caption (reserved; not shown on tiles). */
  caption?: string;
  media: ProjectMedia;
};

export type WorkCategory = {
  id: string;
  title: string;
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
