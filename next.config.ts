import type { NextConfig } from "next";

function getWordpressHostname(): string | null {
  const baseUrl = process.env.WORDPRESS_API_BASE_URL;

  if (!baseUrl) {
    return null;
  }

  try {
    return new URL(baseUrl).hostname;
  } catch {
    return null;
  }
}

const wordpressHostname = getWordpressHostname();

const nextConfig: NextConfig = {
  // Keep repository AGENTS.md authoritative; do not let Next overwrite it.
  agentRules: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: wordpressHostname
      ? [
          {
            protocol: "https",
            hostname: wordpressHostname,
          },
          {
            protocol: "http",
            hostname: wordpressHostname,
          },
        ]
      : [],
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
