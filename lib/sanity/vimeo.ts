/**
 * Extract a Vimeo player path from a URL or raw ID.
 * Returns `123456789` or `123456789/privacyHash` for unlisted embeds.
 */
export function extractVimeoId(
  value: string | null | undefined,
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  // Studio / account UI: https://vimeo.com/manage/videos/123456789
  const manage = trimmed.match(/vimeo\.com\/manage\/videos\/(\d+)/i);
  if (manage?.[1]) {
    return manage[1];
  }

  // Unlisted / privacy hash: https://vimeo.com/123456789/a1b2c3d4e5
  const withHash = trimmed.match(
    /(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)\/([a-zA-Z0-9]+)/i,
  );
  if (withHash?.[1] && withHash[2]) {
    return `${withHash[1]}/${withHash[2]}`;
  }

  const patterns = [
    /player\.vimeo\.com\/video\/(\d+)/i,
    /vimeo\.com\/(?:video\/)?(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return undefined;
}

/** Build a poster-first Vimeo embed URL (muted autoplay after user gesture). */
export function buildVimeoEmbedSrc(videoId: string): string {
  const id = videoId.trim().replace(/^\/+/, "");
  return `https://player.vimeo.com/video/${id}?autoplay=1&muted=1&dnt=1&playsinline=1&title=0&byline=0&portrait=0&badge=0`;
}
