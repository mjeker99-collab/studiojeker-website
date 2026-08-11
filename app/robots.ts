import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

/** Required for `output: "export"`. */
export const dynamic = "force-static";

/**
 * Production robots — allow public indexing.
 * Preview/tunnel hosts must not be used as the sitemap base URL.
 */
export default function robots(): MetadataRoute.Robots {
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
