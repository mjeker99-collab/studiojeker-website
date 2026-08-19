/**
 * Official Studiojeker social profiles.
 * Used by the global footer; do not invent additional networks.
 */
export const studiojekerSocial = [
  {
    id: "linkedin",
    href: "https://www.linkedin.com/company/studiojeker/",
    label: "Studiojeker auf LinkedIn",
  },
  {
    id: "instagram",
    href: "https://www.instagram.com/studiojeker/",
    label: "Studiojeker auf Instagram",
  },
  {
    id: "facebook",
    href: "https://www.facebook.com/studiojeker/",
    label: "Studiojeker auf Facebook",
  },
] as const;

export type SocialNetworkId = (typeof studiojekerSocial)[number]["id"];
