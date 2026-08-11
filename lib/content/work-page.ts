import type { Locale } from "@/types/i18n";
import { localizePathname } from "@/lib/i18n/config";
import { getServicePaths } from "@/lib/content/services/paths";
import { getHomepageContent } from "@/lib/content/homepage";
import type { WorkPageContent } from "@/components/work/WorkPage";

type TileImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

function tiles(
  categoryId: string,
  images: TileImage[],
): Array<{ id: string; image: TileImage }> {
  return images.map((image, index) => ({
    id: `${categoryId}-${index + 1}`,
    image,
  }));
}

/**
 * Work overview — four equal category grids (4 tiles each).
 * Visual placeholders only until approved case studies exist.
 * No invented clients, project titles or developer notes.
 */
export function getWorkPageContent(locale: Locale): WorkPageContent {
  const home = getHomepageContent(locale);
  const paths = getServicePaths(locale);
  const contact = localizePathname("/contact", locale);

  const digitalImages: TileImage[] = [
    {
      src: "/images/Social marketing/Social marketing/Zofingen-0279-b9bf2eb3.jpg",
      alt:
        locale === "en"
          ? "Content & Digital Marketing visual"
          : "Visual Content & Digital Marketing",
      width: 1200,
      height: 800,
    },
    {
      src: "/images/Social marketing/Social marketing/Eventfotografie-2-a35bdf37.jpg",
      alt:
        locale === "en"
          ? "Content & Digital Marketing visual"
          : "Visual Content & Digital Marketing",
      width: 1600,
      height: 1066,
    },
    {
      src: "/images/Social marketing/Social marketing/Filmproduktionimg1.jpg",
      alt:
        locale === "en"
          ? "Content & Digital Marketing visual"
          : "Visual Content & Digital Marketing",
      width: 1600,
      height: 1066,
    },
    {
      src: "/images/Social marketing/Social marketing/PHOTO-2023-05-11-15-00-27.jpg",
      alt:
        locale === "en"
          ? "Content & Digital Marketing visual"
          : "Visual Content & Digital Marketing",
      width: 1200,
      height: 900,
    },
  ];

  const businessImages: TileImage[] = [
    {
      src: "/images/business/Business_3-e21f49d5.jpg",
      alt:
        locale === "en"
          ? "Business Communication visual"
          : "Visual Business Communication",
      width: 1200,
      height: 800,
    },
    {
      src: "/images/business/Reportage_21-d196d171.jpg",
      alt:
        locale === "en"
          ? "Business Communication visual"
          : "Visual Business Communication",
      width: 1200,
      height: 800,
    },
    {
      src: "/images/business/Business_1-03e4abec.jpg",
      alt:
        locale === "en"
          ? "Business Communication visual"
          : "Visual Business Communication",
      width: 1200,
      height: 800,
    },
    {
      src: "/images/business/Industrie_1-1dfc4e3a.jpg",
      alt:
        locale === "en"
          ? "Business Communication visual"
          : "Visual Business Communication",
      width: 1200,
      height: 800,
    },
  ];

  const productImages: TileImage[] = [
    {
      src: "/images/product/Watch_3-057ab44a.jpg",
      alt:
        locale === "en"
          ? "Product Communication visual"
          : "Visual Product Communication",
      width: 1200,
      height: 800,
    },
    {
      src: "/images/product/Produktfotografie-scaled.jpg",
      alt:
        locale === "en"
          ? "Product Communication visual"
          : "Visual Product Communication",
      width: 1200,
      height: 1600,
    },
    {
      src: "/images/product/Produkt_7.jpg",
      alt:
        locale === "en"
          ? "Product Communication visual"
          : "Visual Product Communication",
      width: 1200,
      height: 800,
    },
    {
      src: "/images/product/Fotocomposing-725efaf0.jpg",
      alt:
        locale === "en"
          ? "Product Communication visual"
          : "Visual Product Communication",
      width: 1200,
      height: 800,
    },
  ];

  const architectureImages: TileImage[] = [
    {
      src: "/images/architecture/v5_02_korr.jpg",
      alt:
        locale === "en"
          ? "Architecture & Real Estate visual"
          : "Visual Architecture & Real Estate",
      width: 1200,
      height: 800,
    },
    {
      src: "/images/architecture/Architekturvisualisierung.jpg",
      alt:
        locale === "en"
          ? "Architecture & Real Estate visual"
          : "Visual Architecture & Real Estate",
      width: 1200,
      height: 800,
    },
    {
      src: "/images/architecture/troesch4.jpg",
      alt:
        locale === "en"
          ? "Architecture & Real Estate visual"
          : "Visual Architecture & Real Estate",
      width: 1200,
      height: 800,
    },
    {
      src: "/images/architecture/3D_2.jpg",
      alt:
        locale === "en"
          ? "Architecture & Real Estate visual"
          : "Visual Architecture & Real Estate",
      width: 1200,
      height: 800,
    },
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
        text: "Photography, film, 3D and marketing — organised by focus area.",
      },
      categories: [
        {
          id: "digital",
          title: "Content & Digital Marketing",
          href: paths.digital,
          items: tiles("digital", digitalImages),
        },
        {
          id: "business",
          title: "Business Communication",
          href: paths.business,
          items: tiles("business", businessImages),
        },
        {
          id: "product",
          title: "Product Communication",
          href: paths.product,
          items: tiles("product", productImages),
        },
        {
          id: "architecture",
          title: "Architecture & Real Estate",
          href: paths.architecture,
          items: tiles("architecture", architectureImages),
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
      text: "Fotografie, Film, 3D und Marketing — geordnet nach den vier Schwerpunkten.",
    },
    categories: [
      {
        id: "digital",
        title: "Content & Digital Marketing",
        href: paths.digital,
        items: tiles("digital", digitalImages),
      },
      {
        id: "business",
        title: "Business Communication",
        href: paths.business,
        items: tiles("business", businessImages),
      },
      {
        id: "product",
        title: "Product Communication",
        href: paths.product,
        items: tiles("product", productImages),
      },
      {
        id: "architecture",
        title: "Architecture & Real Estate",
        href: paths.architecture,
        items: tiles("architecture", architectureImages),
      },
    ],
    finalCta: home.finalCta,
  };
}
