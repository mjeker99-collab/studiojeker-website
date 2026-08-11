import type { Locale } from "@/types/i18n";
import type { ProjectMedia, WorkPageContent, WorkProjectItem } from "@/types/work";
import { localizePathname } from "@/lib/i18n/config";
import { getHomepageContent } from "@/lib/content/homepage";
import { showreels } from "@/lib/content/showreels";

type ImageAsset = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

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

function videoItem(
  id: string,
  title: string,
  media: Extract<ProjectMedia, { type: "video" }>,
): WorkProjectItem {
  return { id, title, media };
}

function slideshowItem(
  id: string,
  title: string,
  media: Extract<ProjectMedia, { type: "slideshow" }>,
): WorkProjectItem {
  return { id, title, media };
}

/**
 * Work overview — four equal category grids (4 tiles each).
 * Media type is switchable per tile (image | video | slideshow).
 * Visual placeholders until approved case studies exist.
 * No service-page links. No invented clients or project titles.
 */
export function getWorkPageContent(locale: Locale): WorkPageContent {
  const home = getHomepageContent(locale);
  const contact = localizePathname("/contact", locale);

  const digitalAlt =
    locale === "en"
      ? "Content & Digital Marketing visual"
      : "Visual Content & Digital Marketing";
  const businessAlt =
    locale === "en"
      ? "Business Communication visual"
      : "Visual Business Communication";
  const productAlt =
    locale === "en"
      ? "Product Communication visual"
      : "Visual Product Communication";
  const architectureAlt =
    locale === "en"
      ? "Architecture & Real Estate visual"
      : "Visual Architecture & Real Estate";

  const digitalImages: ImageAsset[] = [
    {
      src: "/images/Social marketing/Social marketing/Zofingen-0279-b9bf2eb3.jpg",
      alt: digitalAlt,
      width: 1200,
      height: 800,
    },
    {
      src: "/images/Social marketing/Social marketing/Eventfotografie-2-a35bdf37.jpg",
      alt: digitalAlt,
      width: 1600,
      height: 1066,
    },
    {
      src: "/images/Social marketing/Social marketing/Filmproduktionimg1.jpg",
      alt: digitalAlt,
      width: 1600,
      height: 1066,
    },
    {
      src: "/images/Social marketing/Social marketing/PHOTO-2023-05-11-15-00-27.jpg",
      alt: digitalAlt,
      width: 1200,
      height: 900,
    },
  ];

  const businessImages: ImageAsset[] = [
    {
      src: "/images/business/Business_3-e21f49d5.jpg",
      alt: businessAlt,
      width: 1200,
      height: 800,
    },
    {
      src: "/images/business/Reportage_21-d196d171.jpg",
      alt: businessAlt,
      width: 1200,
      height: 800,
    },
    {
      src: "/images/business/Business_1-03e4abec.jpg",
      alt: businessAlt,
      width: 1200,
      height: 800,
    },
    {
      src: "/images/business/Industrie_1-1dfc4e3a.jpg",
      alt: businessAlt,
      width: 1200,
      height: 800,
    },
  ];

  const productImages: ImageAsset[] = [
    {
      src: "/images/product/Watch_3-057ab44a.jpg",
      alt: productAlt,
      width: 1200,
      height: 800,
    },
    {
      src: "/images/product/Produktfotografie-scaled.jpg",
      alt: productAlt,
      width: 1200,
      height: 1600,
    },
    {
      src: "/images/product/Produkt_7.jpg",
      alt: productAlt,
      width: 1200,
      height: 800,
    },
    {
      src: "/images/product/Fotocomposing-725efaf0.jpg",
      alt: productAlt,
      width: 1200,
      height: 800,
    },
  ];

  const architectureImages: ImageAsset[] = [
    {
      src: "/images/architecture/v5_02_korr.jpg",
      alt: architectureAlt,
      width: 1200,
      height: 800,
    },
    {
      src: "/images/architecture/Architekturvisualisierung.jpg",
      alt: architectureAlt,
      width: 1200,
      height: 800,
    },
    {
      src: "/images/architecture/troesch4.jpg",
      alt: architectureAlt,
      width: 1200,
      height: 800,
    },
    {
      src: "/images/architecture/3D_2.jpg",
      alt: architectureAlt,
      width: 1200,
      height: 800,
    },
  ];

  const digitalTitle = "Content & Digital Marketing";
  const businessTitle = "Business Communication";
  const productTitle = "Product Communication";
  const architectureTitle = "Architecture & Real Estate";

  /**
   * Demo media mix (placeholder assets / existing showreel IDs):
   * - digital tile 3 → Vimeo video
   * - product tile 1 → slideshow
   * Remaining tiles stay static images until final project media is defined.
   */
  const digitalItems: WorkProjectItem[] = [
    imageItem("digital-1", digitalTitle, digitalImages[0]),
    imageItem("digital-2", digitalTitle, digitalImages[1]),
    videoItem("digital-3", digitalTitle, {
      type: "video",
      src: showreels.digitalMarketing,
      poster: digitalImages[2].src,
      alt: digitalImages[2].alt,
      provider: "vimeo",
    }),
    imageItem("digital-4", digitalTitle, digitalImages[3]),
  ];

  const businessItems: WorkProjectItem[] = [
    imageItem("business-1", businessTitle, businessImages[0]),
    imageItem("business-2", businessTitle, businessImages[1]),
    imageItem("business-3", businessTitle, businessImages[2]),
    imageItem("business-4", businessTitle, businessImages[3]),
  ];

  const productItems: WorkProjectItem[] = [
    slideshowItem("product-1", productTitle, {
      type: "slideshow",
      alt: productAlt,
      interval: 4500,
      images: [
        productImages[0],
        productImages[1],
        productImages[2],
        productImages[3],
      ],
    }),
    imageItem("product-2", productTitle, productImages[1]),
    imageItem("product-3", productTitle, productImages[2]),
    imageItem("product-4", productTitle, productImages[3]),
  ];

  const architectureItems: WorkProjectItem[] = [
    imageItem("architecture-1", architectureTitle, architectureImages[0]),
    imageItem("architecture-2", architectureTitle, architectureImages[1]),
    imageItem("architecture-3", architectureTitle, architectureImages[2]),
    imageItem("architecture-4", architectureTitle, architectureImages[3]),
  ];

  if (locale === "en") {
    return {
      seo: {
        title: "Work | Studiojeker",
        description:
          "Selected projects across Content & Digital Marketing, Business Communication, Product Communication and Architecture & Real Estate.",
      },
      hero: {
        label: "Work",
        headline: "Selected projects.",
        text: "Strategy, content and design — moved, staged and effective across every channel.",
      },
      categories: [
        { id: "digital", title: digitalTitle, items: digitalItems },
        { id: "business", title: businessTitle, items: businessItems },
        { id: "product", title: productTitle, items: productItems },
        {
          id: "architecture",
          title: architectureTitle,
          items: architectureItems,
        },
      ],
      finalCta: {
        ...home.finalCta,
        cta: { label: "Get in touch", href: contact },
      },
    };
  }

  return {
    seo: {
      title: "Work | Studiojeker",
      description:
        "Ausgewählte Arbeiten in Content & Digital Marketing, Business Communication, Product Communication und Architecture & Real Estate.",
    },
    hero: {
      label: "Work",
      headline: "Ausgewählte Projekte.",
      text: "Strategie, Content und Design – bewegt, inszeniert und wirksam über alle Kanäle.",
    },
    categories: [
      { id: "digital", title: digitalTitle, items: digitalItems },
      { id: "business", title: businessTitle, items: businessItems },
      { id: "product", title: productTitle, items: productItems },
      {
        id: "architecture",
        title: architectureTitle,
        items: architectureItems,
      },
    ],
    finalCta: home.finalCta,
  };
}
