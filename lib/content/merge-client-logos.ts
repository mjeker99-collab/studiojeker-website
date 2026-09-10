import type { HomepageClientLogo } from "@/types/homepage";
import type { SanityClientLogo } from "@/lib/sanity/clients";
import { resolveSanityImage } from "@/lib/sanity/media";

function clean(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function sortByOrder<T extends { sortOrder?: number | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aOrder = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });
}

/**
 * Map Sanity Client documents to logo models.
 *
 * Same merge used by Contact (the approved logo-slider reference).
 * No quantity cap: every enabled client with a resolvable logo is kept.
 * Marquee duplication happens only in the UI for seamless looping.
 *
 * Fallback dimensions match the padded-square SVG pack (600×600) so missing
 * metadata does not trigger the tight-crop size path in ClientsSection.
 */
export function mergeClientLogos(
  base: HomepageClientLogo[],
  clients: SanityClientLogo[] | null | undefined,
): HomepageClientLogo[] {
  const source = clients ?? [];
  const activeClients = sortByOrder(
    source.filter(
      (client): client is NonNullable<SanityClientLogo> =>
        Boolean(client && client.active !== false && client.logo),
    ),
  );

  if (activeClients.length === 0) {
    return base;
  }

  const merged = activeClients
    .map((client, index) => {
      const name = clean(client.name ?? undefined);
      const logo = client.logo;
      if (!name || !logo) {
        return null;
      }

      const resolved = resolveSanityImage(logo, {
        src: "",
        alt: name,
        width: 600,
        height: 600,
      });

      if (!resolved.src) {
        return null;
      }

      return {
        id: client._id ?? `client-${index}`,
        name,
        src: resolved.src,
        width: resolved.width,
        height: resolved.height,
      };
    })
    .filter((logo): logo is HomepageClientLogo => Boolean(logo?.src));

  return merged.length > 0 ? merged : base;
}
