import type { HomepageClientLogo } from "@/types/homepage";

/**
 * Static fallback logos used only when Sanity returns no enabled Client documents.
 * Not a live-source cap — the CMS list is uncapped and replaces this entirely when present.
 */
export function getClientLogos(): HomepageClientLogo[] {
  return [
    {
      id: "hirslanden",
      name: "Hirslanden",
      src: "/images/Client logos/Hirslanden-01-2.svg",
      width: 160,
      height: 48,
    },
    {
      id: "ubs",
      name: "UBS",
      src: "/images/Client logos/UBS-2.svg",
      width: 120,
      height: 48,
    },
    {
      id: "certina",
      name: "Certina",
      src: "/images/Client logos/Certina-2.svg",
      width: 140,
      height: 48,
    },
    {
      id: "bossard",
      name: "Bossard",
      src: "/images/Client logos/Bossard-2.svg",
      width: 140,
      height: 48,
    },
    {
      id: "endress",
      name: "Endress+Hauser",
      src: "/images/Client logos/Endress-Hauser-2.svg",
      width: 180,
      height: 48,
    },
    {
      id: "raiffeisen",
      name: "Raiffeisen",
      src: "/images/Client logos/Raiffeisen-2.svg",
      width: 150,
      height: 48,
    },
  ];
}
