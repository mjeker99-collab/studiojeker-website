import type { Locale } from "@/types/i18n";
import type {
  ServiceMediaSection,
  ServiceMediaSectionId,
  ServicePageSlug,
} from "@/types/service-page";
import type { ProjectMedia, WorkProjectItem } from "@/types/work";

type ImageAsset = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

const SECTION_TITLES: Record<
  ServiceMediaSectionId,
  { de: string; en: string }
> = {
  photos: { de: "Fotos & Bildserien", en: "Photos & series" },
  videos: { de: "Videos", en: "Videos" },
  visualizations: { de: "Visualisierungen", en: "Visualizations" },
  animations: { de: "Animationen", en: "Animations" },
};

/** Expected media section types per service area (Digital is out of scope). */
export const EXPECTED_MEDIA_SECTIONS: Partial<
  Record<ServicePageSlug, readonly ServiceMediaSectionId[]>
> = {
  "business-communication": ["photos", "videos"],
  "product-communication": ["photos", "videos", "animations"],
  architecture: ["photos", "videos", "visualizations", "animations"],
};

function sectionTitle(id: ServiceMediaSectionId, locale: Locale): string {
  return SECTION_TITLES[id][locale === "en" ? "en" : "de"];
}

function imageItem(
  id: string,
  title: string,
  image: ImageAsset,
): WorkProjectItem {
  return {
    id,
    title,
    media: {
      type: "image",
      src: image.src,
      alt: image.alt,
      width: image.width,
      height: image.height,
    },
  };
}

function slideshowItem(
  id: string,
  title: string,
  media: Extract<ProjectMedia, { type: "slideshow" }>,
): WorkProjectItem {
  return { id, title, media };
}

function buildSection(
  id: ServiceMediaSectionId,
  locale: Locale,
  items: WorkProjectItem[],
): ServiceMediaSection {
  return {
    id,
    title: sectionTitle(id, locale),
    items,
  };
}

/**
 * Local media galleries for the three service landing pages.
 * Uses existing studio image assets already on these pages — no invented
 * clients or project names. Empty expected sections are listed in
 * `missingContent` for internal preview only.
 */
export function getServiceMediaFallback(
  slug: ServicePageSlug,
  locale: Locale,
): {
  label: string;
  headline: string;
  sections: ServiceMediaSection[];
  missingContent: string[];
} {
  const label =
    locale === "en" ? "Selected work" : "Ausgewählte Arbeiten";
  const headline = label;
  const expected = EXPECTED_MEDIA_SECTIONS[slug] ?? [];

  if (slug === "business-communication") {
    const alt =
      locale === "en"
        ? "Business Communication visual"
        : "Visual Business Communication";
    const title = "Business Communication";
    const photos: ImageAsset[] = [
      {
        src: "/images/business/Business_1-03e4abec.jpg",
        alt,
        width: 1200,
        height: 800,
      },
      {
        src: "/images/business/Business_4-22cbf9b5.jpg",
        alt,
        width: 1200,
        height: 800,
      },
      {
        src: "/images/business/Reportage_21-d196d171.jpg",
        alt,
        width: 1200,
        height: 800,
      },
      {
        src: "/images/business/Reportage_9-cb3c2e4c.jpg",
        alt,
        width: 1200,
        height: 800,
      },
    ];
    const sections = [
      buildSection(
        "photos",
        locale,
        photos.map((image, index) =>
          imageItem(`biz-photo-${index + 1}`, title, image),
        ),
      ),
      buildSection("videos", locale, []),
    ];
    return {
      label,
      headline,
      sections,
      missingContent: listMissing(expected, sections, locale),
    };
  }

  if (slug === "product-communication") {
    const alt =
      locale === "en"
        ? "Product Communication visual"
        : "Visual Product Communication";
    const title = "Product Communication";
    const photos: ImageAsset[] = [
      {
        src: "/images/product/Produktfotografie-scaled.jpg",
        alt,
        width: 1200,
        height: 1600,
      },
      {
        src: "/images/product/Watch_3-057ab44a.jpg",
        alt,
        width: 1200,
        height: 800,
      },
      {
        src: "/images/product/Uhren_3-c83cc10e.jpg",
        alt,
        width: 1200,
        height: 800,
      },
      {
        src: "/images/product/Fotocomposing-725efaf0.jpg",
        alt,
        width: 1200,
        height: 800,
      },
    ];
    const sections = [
      buildSection("photos", locale, [
        slideshowItem("prod-photo-series-1", title, {
          type: "slideshow",
          alt,
          interval: 4500,
          images: photos,
        }),
        imageItem("prod-photo-2", title, photos[1]),
        imageItem("prod-photo-3", title, photos[2]),
        imageItem("prod-photo-4", title, photos[3]),
      ]),
      buildSection("videos", locale, []),
      buildSection("animations", locale, []),
    ];
    return {
      label,
      headline,
      sections,
      missingContent: listMissing(expected, sections, locale),
    };
  }

  if (slug === "architecture") {
    const photoAlt =
      locale === "en"
        ? "Architecture photography visual"
        : "Architekturfotografie";
    const vizAlt =
      locale === "en"
        ? "Architecture visualization"
        : "Architekturvisualisierung";
    const title = "Architecture & Real Estate";
    const photos: ImageAsset[] = [
      {
        src: "/images/architecture/troesch4.jpg",
        alt: photoAlt,
        width: 1200,
        height: 800,
      },
      {
        src: "/images/architecture/IMG_9915.jpg",
        alt: photoAlt,
        width: 1200,
        height: 800,
      },
    ];
    const visualizations: ImageAsset[] = [
      {
        src: "/images/architecture/v5_02_korr.jpg",
        alt: vizAlt,
        width: 1200,
        height: 800,
      },
      {
        src: "/images/architecture/Architekturvisualisierung.jpg",
        alt: vizAlt,
        width: 1200,
        height: 800,
      },
      {
        src: "/images/architecture/3D_2.jpg",
        alt: vizAlt,
        width: 1200,
        height: 800,
      },
    ];
    const sections = [
      buildSection(
        "photos",
        locale,
        photos.map((image, index) =>
          imageItem(`arch-photo-${index + 1}`, title, image),
        ),
      ),
      buildSection("videos", locale, []),
      buildSection(
        "visualizations",
        locale,
        visualizations.map((image, index) =>
          imageItem(`arch-viz-${index + 1}`, title, image),
        ),
      ),
      buildSection("animations", locale, []),
    ];
    return {
      label,
      headline,
      sections,
      missingContent: listMissing(expected, sections, locale),
    };
  }

  // Digital Marketing and unknown slugs: no media galleries in this scope.
  return {
    label,
    headline,
    sections: [],
    missingContent: [],
  };
}

function listMissing(
  expected: readonly ServiceMediaSectionId[],
  sections: ServiceMediaSection[],
  locale: Locale,
): string[] {
  const filled = new Set(
    sections.filter((section) => section.items.length > 0).map((s) => s.id),
  );
  return expected
    .filter((id) => !filled.has(id))
    .map((id) =>
      locale === "en"
        ? `Media section “${SECTION_TITLES[id].en}” — awaiting approved assets from Martin`
        : `Medienabschnitt «${SECTION_TITLES[id].de}» — freigegebene Medien von Martin ausstehend`,
    );
}

/** Keep only sections that have at least one playable/visible media item. */
export function visibleMediaSections(
  sections: ServiceMediaSection[],
): ServiceMediaSection[] {
  return sections.filter((section) =>
    section.items.some((item) => hasRenderableMedia(item.media)),
  );
}

function hasRenderableMedia(media: ProjectMedia): boolean {
  if (media.type === "image") {
    return Boolean(media.src);
  }
  if (media.type === "video") {
    return Boolean(media.src && media.poster);
  }
  return media.images.some((image) => Boolean(image.src));
}
