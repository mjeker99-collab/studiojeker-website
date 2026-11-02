import { studioSnapshot, type StudioSnapshot } from "./input";

/** Older dialog posts can have no layout. Give imported results a plain layout,
 * without adding a logo or headline that the user has not chosen. */
export function resultSnapshot(
  existing: StudioSnapshot | undefined,
  seriesId: string,
  logoSha256: string,
): StudioSnapshot {
  return (
    existing ||
    studioSnapshot.parse({
      organizationId: "studiojeker",
      seriesId,
      brandVersion: "studio-v1",
      imageIdea: "",
      headline: "",
      hashtags: "",
      motifAssetId: null,
      motifSha256: "",
      fontAssetId: null,
      fontSha256: "",
      logoSha256,
      template: "PHOTO",
      formats: ["1:1"],
      cropX: 0.5,
      cropY: 0.5,
      zoom: 1,
      showLogo: false,
      showClaim: false,
      showHeadline: false,
      source: "AI",
    })
  );
}
