import type { MetadataRoute } from "next";
import { isStagingSite, siteConfig } from "@/lib/site";

/** Required for `output: "export"`. */
export const dynamic = "force-static";

/**
 * robots.txt for static export.
 * Staging (`NEXT_PUBLIC_SITE_URL=https://staging2026.studiojeker.ch`) → Disallow: /
 * Production → Allow: /
 */
export default function robots(): MetadataRoute.Robots {
  if (isStagingSite()) {
    return {
      rules: [
        {
          userAgent: "*",
          disallow: "/",
        },
      ],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `${siteConfig.getUrl()}/sitemap.xml`,
    host: siteConfig.getUrl().replace(/^https?:\/\//, ""),
  };
}
