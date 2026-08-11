import type { Locale } from "@/types/i18n";
import { localizePathname } from "@/lib/i18n/config";
import { getServicePaths } from "@/lib/content/services/paths";
import { getHomepageContent } from "@/lib/content/homepage";
import type { WorkPageContent } from "@/components/work/WorkPage";

/**
 * Work overview — category placeholders only until real case studies are supplied.
 * No invented clients, project titles or developer notes in public copy.
 */
export function getWorkPageContent(locale: Locale): WorkPageContent {
  const home = getHomepageContent(locale);
  const paths = getServicePaths(locale);
  const contact = localizePathname("/contact", locale);

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
          items: [
            {
              id: "digital-1",
              image: {
                src: "/images/Social marketing/Social marketing/Zofingen-0279-b9bf2eb3.jpg",
                alt: "Content & Digital Marketing visual",
                width: 1200,
                height: 800,
              },
            },
            {
              id: "digital-2",
              image: {
                src: "/images/Social marketing/Social marketing/Eventfotografie-2-a35bdf37.jpg",
                alt: "Content & Digital Marketing visual",
                width: 1600,
                height: 1066,
              },
            },
          ],
        },
        {
          id: "business",
          title: "Business Communication",
          href: paths.business,
          items: [
            {
              id: "business-1",
              image: {
                src: "/images/business/Business_3-e21f49d5.jpg",
                alt: "Business Communication visual",
                width: 1200,
                height: 800,
              },
            },
            {
              id: "business-2",
              image: {
                src: "/images/business/Reportage_21-d196d171.jpg",
                alt: "Business Communication visual",
                width: 1200,
                height: 800,
              },
            },
          ],
        },
        {
          id: "product",
          title: "Product Communication",
          href: paths.product,
          items: [
            {
              id: "product-1",
              image: {
                src: "/images/product/Watch_3-057ab44a.jpg",
                alt: "Product Communication visual",
                width: 1200,
                height: 800,
              },
            },
            {
              id: "product-2",
              image: {
                src: "/images/product/Produktfotografie-scaled.jpg",
                alt: "Product Communication visual",
                width: 1200,
                height: 1600,
              },
            },
          ],
        },
        {
          id: "architecture",
          title: "Architecture & Real Estate",
          href: paths.architecture,
          items: [
            {
              id: "architecture-1",
              image: {
                src: "/images/architecture/v5_02_korr.jpg",
                alt: "Architecture & Real Estate visual",
                width: 1200,
                height: 800,
              },
            },
            {
              id: "architecture-2",
              image: {
                src: "/images/architecture/Architekturvisualisierung.jpg",
                alt: "Architecture & Real Estate visual",
                width: 1200,
                height: 800,
              },
            },
          ],
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
        items: [
          {
            id: "digital-1",
            image: {
              src: "/images/Social marketing/Social marketing/Zofingen-0279-b9bf2eb3.jpg",
              alt: "Visual Content & Digital Marketing",
              width: 1200,
              height: 800,
            },
          },
          {
            id: "digital-2",
            image: {
              src: "/images/Social marketing/Social marketing/Eventfotografie-2-a35bdf37.jpg",
              alt: "Visual Content & Digital Marketing",
              width: 1600,
              height: 1066,
            },
          },
        ],
      },
      {
        id: "business",
        title: "Business Communication",
        href: paths.business,
        items: [
          {
            id: "business-1",
            image: {
              src: "/images/business/Business_3-e21f49d5.jpg",
              alt: "Visual Business Communication",
              width: 1200,
              height: 800,
            },
          },
          {
            id: "business-2",
            image: {
              src: "/images/business/Reportage_21-d196d171.jpg",
              alt: "Visual Business Communication",
              width: 1200,
              height: 800,
            },
          },
        ],
      },
      {
        id: "product",
        title: "Product Communication",
        href: paths.product,
        items: [
          {
            id: "product-1",
            image: {
              src: "/images/product/Watch_3-057ab44a.jpg",
              alt: "Visual Product Communication",
              width: 1200,
              height: 800,
            },
          },
          {
            id: "product-2",
            image: {
              src: "/images/product/Produktfotografie-scaled.jpg",
              alt: "Visual Product Communication",
              width: 1200,
              height: 1600,
            },
          },
        ],
      },
      {
        id: "architecture",
        title: "Architecture & Real Estate",
        href: paths.architecture,
        items: [
          {
            id: "architecture-1",
            image: {
              src: "/images/architecture/v5_02_korr.jpg",
              alt: "Visual Architecture & Real Estate",
              width: 1200,
              height: 800,
            },
          },
          {
            id: "architecture-2",
            image: {
              src: "/images/architecture/Architekturvisualisierung.jpg",
              alt: "Visual Architecture & Real Estate",
              width: 1200,
              height: 800,
            },
          },
        ],
      },
    ],
    finalCta: home.finalCta,
  };
}
