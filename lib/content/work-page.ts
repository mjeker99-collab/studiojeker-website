import type { Locale } from "@/types/i18n";
import type { ProjectMedia, WorkPageContent, WorkProjectItem } from "@/types/work";
import { localizePathname } from "@/lib/i18n/config";
import { getServicePaths } from "@/lib/content/services/paths";
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
  href: string,
  image: ImageAsset,
): WorkProjectItem {
  return {
    id,
    title,
    href,
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
 * No invented clients or project titles in the UI.
 */
export function getWorkPageContent(locale: Locale): WorkPageContent {
  const home = getHomepageContent(locale);
  const paths = getServicePaths(locale);
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
   * Demo media mix (same assets / existing showreel IDs):
   * - digital tile 3 → Vimeo video (poster = existing film still)
   * - product tile 1 → slideshow of product stills
   * Remaining tiles stay static images until final project media is defined.
   */
  const digitalItems: WorkProjectItem[] = [
    imageItem("digital-1", digitalTitle, paths.digital, digitalImages[0]),
    imageItem("digital-2", digitalTitle, paths.digital, digitalImages[1]),
    videoItem("digital-3", digitalTitle, {
      type: "video",
      src: showreels.digitalMarketing,
      poster: digitalImages[2].src,
      posterAlt: digitalImages[2].alt,
      provider: "vimeo",
    }),
    imageItem("digital-4", digitalTitle, paths.digital, digitalImages[3]),
  ];

  const businessItems: WorkProjectItem[] = [
    imageItem("business-1", businessTitle, paths.business, businessImages[0]),
    imageItem("business-2", businessTitle, paths.business, businessImages[1]),
    imageItem("business-3", businessTitle, paths.business, businessImages[2]),
    imageItem("business-4", businessTitle, paths.business, businessImages[3]),
  ];

  const productItems: WorkProjectItem[] = [
    slideshowItem("product-1", productTitle, {
      type: "slideshow",
      interval: 4500,
      images: [
        productImages[0],
        productImages[1],
        productImages[2],
        productImages[3],
      ],
    }),
    imageItem("product-2", productTitle, paths.product, productImages[1]),
    imageItem("product-3", productTitle, paths.product, productImages[2]),
    imageItem("product-4", productTitle, paths.product, productImages[3]),
  ];

  const architectureItems: WorkProjectItem[] = [
    imageItem("architecture-1", architectureTitle, paths.architecture, architectureImages[0]),
    imageItem("architecture-2", architectureTitle, paths.architecture, architectureImages[1]),
    imageItem("architecture-3", architectureTitle, paths.architecture, architectureImages[2]),
    imageItem("architecture-4", architectureTitle, paths.architecture, architectureImages[3]),
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
        {
          id: "digital",
          title: digitalTitle,
          href: paths.digital,
          items: digitalItems,
        },
        {
          id: "business",
          title: businessTitle,
          href: paths.business,
          items: businessItems,
        },
        {
          id: "product",
          title: productTitle,
          href: paths.product,
          items: productItems,
        },
        {
          id: "architecture",
          title: architectureTitle,
          href: paths.architecture,
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
      {
        id: "digital",
        title: digitalTitle,
        href: paths.digital,
        items: digitalItems,
      },
      {
        id: "business",
        title: businessTitle,
        href: paths.business,
        items: businessItems,
      },
      {
        id: "product",
        title: productTitle,
        href: paths.product,
        items: productItems,
      },
      {
        id: "architecture",
        title: architectureTitle,
        href: paths.architecture,
        items: architectureItems,
      },
    ],
    finalCta: home.finalCta,
  };
}
