import type { WpMedia } from "@/types/wordpress";

export type ResponsiveImageSource = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

/**
 * Normalize WordPress media into Next.js Image-friendly props.
 */
export function toResponsiveImage(
  media: WpMedia | null | undefined,
  fallbackAlt = "",
): ResponsiveImageSource | null {
  if (!media?.sourceUrl) {
    return null;
  }

  return {
    src: media.sourceUrl,
    alt: media.altText?.trim() || fallbackAlt,
    width: media.width,
    height: media.height,
  };
}

export function isLocalPublicPath(src: string): boolean {
  return src.startsWith("/");
}

export function isRemoteMediaUrl(src: string): boolean {
  return /^https?:\/\//i.test(src);
}
