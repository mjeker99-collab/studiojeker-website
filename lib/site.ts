export const siteConfig = {
  name: "Studiojeker",
  claim: "We Create Visibility.",
  positioning: "Visual Content & Marketing for Businesses",
  since: "1992",
  /**
   * Public site URL for metadata/canonicals.
   * Override via NEXT_PUBLIC_SITE_URL when deploying.
   */
  getUrl(): string {
    return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
  },
} as const;
