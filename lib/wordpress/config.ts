/**
 * WordPress REST configuration.
 * The app must build without a live WordPress connection.
 * WORDPRESS_API_BASE_URL is server-only — never expose via NEXT_PUBLIC_*.
 */
export function getWordpressApiBaseUrl(): string | null {
  const value = process.env.WORDPRESS_API_BASE_URL?.trim();

  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    // Production CMS must be HTTPS only.
    if (url.protocol !== "https:") {
      return null;
    }
    return value.replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function isWordpressConfigured(): boolean {
  return Boolean(getWordpressApiBaseUrl());
}

export const wordpressEndpoints = {
  pages: "/wp-json/wp/v2/pages",
  media: "/wp-json/wp/v2/media",
  // Custom post types will be registered in WordPress later.
  projects: "/wp-json/wp/v2/projects",
  teamMembers: "/wp-json/wp/v2/team-members",
  services: "/wp-json/wp/v2/services",
  clients: "/wp-json/wp/v2/clients",
  visibilitySubscription: "/wp-json/wp/v2/visibility-subscription",
  settings: "/wp-json/studiojeker/v1/settings",
} as const;
