/**
 * Still frames aligned to the start of known hero / loop Vimeo clips.
 *
 * Sourced from Vimeo’s video thumbnail at 1920×1080 (same 16:9 plane as the
 * background embed). Used by HeroVimeoLoop so the poster→video handoff does
 * not jump when a CMS poster was taken from mid-clip or a different crop.
 *
 * When a new hero Vimeo ID is introduced, add a matching still here.
 */
export type VimeoFirstFramePoster = {
  src: string;
  width: number;
  height: number;
};

export const VIMEO_FIRST_FRAME_POSTERS: Record<string, VimeoFirstFramePoster> = {
  // Homepage / Abo / general showreel
  "1216347773": {
    src: "/images/vimeo-posters/1216347773.jpg",
    width: 1920,
    height: 1080,
  },
  // Digital Marketing
  "1216349266": {
    src: "/images/vimeo-posters/1216349266.jpg",
    width: 1920,
    height: 1080,
  },
  // Business + Product Communication
  "1216349221": {
    src: "/images/vimeo-posters/1216349221.jpg",
    width: 1920,
    height: 1080,
  },
  // Architecture
  "1216349245": {
    src: "/images/vimeo-posters/1216349245.jpg",
    width: 1920,
    height: 1080,
  },
  // Short hero loops (e.g. baseball)
  "1226148277": {
    src: "/images/vimeo-posters/1226148277.jpg",
    width: 1920,
    height: 1080,
  },
  // KI / AI
  "1228871502": {
    src: "/images/vimeo-posters/1228871502.jpg",
    width: 1920,
    height: 1080,
  },
};

export function getVimeoFirstFramePoster(
  videoId: string,
): VimeoFirstFramePoster | undefined {
  return VIMEO_FIRST_FRAME_POSTERS[videoId];
}
