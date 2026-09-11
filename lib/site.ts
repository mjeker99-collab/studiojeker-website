const PRODUCTION_URL = "https://www.studiojeker.ch";
/** Staging host used by Metanet deploy (`NEXT_PUBLIC_SITE_URL`). */
const STAGING_URL = "https://staging2026.studiojeker.ch";

export const siteConfig = {
  name: "Studiojeker",
  claim: "We Create Visibility.",
  positioning: "Visual Content & Marketing for Businesses",
  since: "1992",
  /**
   * Production domain for canonicals, sitemap, Open Graph and robots.
   * Override via NEXT_PUBLIC_SITE_URL only when intentionally targeting
   * a non-production host (never bake preview tunnel URLs into commits).
   */
  productionUrl: PRODUCTION_URL,
  stagingUrl: STAGING_URL,
  /**
   * Default Open Graph image — homepage hero (architecture visualisation).
   * Replace with a dedicated OG asset when one is supplied.
   */
  defaultOgImage: {
    path: "/images/architecture/hero-villa-master.jpg",
    width: 1785,
    height: 977,
    alt: "Studiojeker — Visual Content & Marketing",
  },
  getUrl(): string {
    const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
    if (
      fromEnv &&
      !/localhost|127\.0\.0\.1|trycloudflare\.com/i.test(fromEnv)
    ) {
      return fromEnv;
    }
    // Never emit localhost or preview tunnels in canonicals / sitemap / OG.
    return PRODUCTION_URL;
  },
} as const;

/**
 * True when the build targets the staging subdomain via NEXT_PUBLIC_SITE_URL.
 * Used for robots noindex / robots.txt Disallow — production stays indexable.
 */
export function isStagingSite(): boolean {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  return fromEnv.toLowerCase() === STAGING_URL;
}
