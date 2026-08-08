/**
 * WordPress REST configuration.
 * The app must build without a live WordPress connection.
 */
export function getWordpressApiBaseUrl(): string | null {
  const value = process.env.WORDPRESS_API_BASE_URL?.trim();

  if (!value) {
    return null;
  }

  return value.replace(/\/$/, "");
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
