import type { NextConfig } from "next";

function getWordpressHostname(): string | null {
  const baseUrl = process.env.WORDPRESS_API_BASE_URL;

  if (!baseUrl) {
    return null;
  }

  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:") {
      return null;
    }
    return url.hostname;
  } catch {
    return null;
  }
}

const wordpressHostname = getWordpressHostname();

/**
 * Static export for Metanet / Plesk Apache hosting (no Node.js runtime).
 *
 * Notes:
 * - `headers()` / `redirects()` in next.config are NOT applied to static
 *   export. Apache equivalents live in `public/.htaccess` (copied into `/out`).
 * - `images.unoptimized` is required — no Next image optimization server.
 * - `trailingSlash: true` emits `/about/index.html` for reliable Apache routing.
 */
const nextConfig: NextConfig = {
  // Keep repository AGENTS.md authoritative; do not let Next overwrite it.
  agentRules: false,
  output: "export",
  trailingSlash: true,
  // Do not advertise the Next.js runtime to clients.
  poweredByHeader: false,
  // Avoid leaking build traces / verbose error overlays in production.
  productionBrowserSourceMaps: false,
  images: {
    unoptimized: true,
    // HTTPS only — never allow remote http:// CMS assets.
    remotePatterns: wordpressHostname
      ? [
          {
            protocol: "https",
            hostname: wordpressHostname,
          },
        ]
      : [],
  },
};

export default nextConfig;
