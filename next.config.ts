import type { NextConfig } from "next";
import { getSecurityHeaders } from "@/lib/security/headers";

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
const enableTurnstile = Boolean(
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim(),
);

const nextConfig: NextConfig = {
  // Keep repository AGENTS.md authoritative; do not let Next overwrite it.
  agentRules: false,
  // Do not advertise the Next.js runtime to clients.
  poweredByHeader: false,
  // Avoid leaking build traces / verbose error overlays in production.
  productionBrowserSourceMaps: false,
  images: {
    formats: ["image/avif", "image/webp"],
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
  async headers() {
    const securityHeaders = getSecurityHeaders({
      wordpressHostname,
      enableTurnstile,
    });
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      // No standalone services overview — homepage is the overview.
      {
        source: "/services",
        destination: "/",
        permanent: true,
      },
      {
        source: "/en/services",
        destination: "/en",
        permanent: true,
      },
      {
        source: "/solutions",
        destination: "/",
        permanent: true,
      },
      {
        source: "/en/solutions",
        destination: "/en",
        permanent: true,
      },
      // Legacy kit/solutions URLs → public /services/* URLs
      {
        source: "/solutions/brand-business",
        destination: "/services/business-communication",
        permanent: true,
      },
      {
        source: "/en/solutions/brand-business",
        destination: "/en/services/business-communication",
        permanent: true,
      },
      {
        source: "/solutions/products-industry",
        destination: "/services/product-communication",
        permanent: true,
      },
      {
        source: "/en/solutions/products-industry",
        destination: "/en/services/product-communication",
        permanent: true,
      },
      {
        source: "/solutions/architecture-real-estate",
        destination: "/services/architecture",
        permanent: true,
      },
      {
        source: "/en/solutions/architecture-real-estate",
        destination: "/en/services/architecture",
        permanent: true,
      },
      {
        source: "/solutions/social-digital-marketing",
        destination: "/services/digital-marketing",
        permanent: true,
      },
      {
        source: "/en/solutions/social-digital-marketing",
        destination: "/en/services/digital-marketing",
        permanent: true,
      },
      // Legacy Work / References URL → /work
      {
        source: "/references",
        destination: "/work",
        permanent: true,
      },
      {
        source: "/en/references",
        destination: "/en/work",
        permanent: true,
      },
      {
        source: "/references/:path*",
        destination: "/work",
        permanent: true,
      },
      {
        source: "/en/references/:path*",
        destination: "/en/work",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
