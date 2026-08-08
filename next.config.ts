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
};

export default nextConfig;
