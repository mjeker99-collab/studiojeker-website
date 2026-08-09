import type { Locale } from "@/types/i18n";
import type { ServicePageContent } from "@/types/service-page";
import { getClientLogos } from "@/lib/content/clients";
import { getServicePaths } from "@/lib/content/services/paths";

export function getProductCommunicationContent(
  locale: Locale,
): ServicePageContent {
  const paths = getServicePaths(locale);
  const clientsLabel =
    locale === "en" ? "Brands that trust us" : "Brands, die uns vertrauen";

  if (locale === "en") {
    return {
      slug: "products-industry",
      seo: {
        title: "Product Photography, Video & 3D Visualization | Studiojeker",
        description:
          "Product photography, product videos, 3D visualizations and animations for industry, technology and innovative products.",
      },
      hero: {
        label: "Product Communication",
        headline: "Great products deserve a great stage",
        headlineAccent: ".",
        subheadline:
          "We create visual communication that explains products, builds trust and supports sales.",
        body: [
          "Whether you are launching a new product, explaining complex technology or strengthening your brand, we create photography, video and 3D content that helps customers understand and value your products.",
        ],
        primaryCta: { label: "Let's talk", href: paths.contact },
        media: {
          src: "/images/product/Watch_3-057ab44a.jpg",
          alt: "Product photography by Studiojeker",
          width: 1200,
          height: 800,
        },
      },
      solutions: {
        label: "Our solutions",
        headline: "Our solutions",
        items: [
          {
            id: "photo",
            title: "Product Photography",
            description:
              "Professional imagery for websites, catalogues, online shops and campaigns.",
            href: paths.references,
            icon: "product-photo",
          },
          {
            id: "film",
            title: "Product Videos",
            description:
              "Present products with emotion, clarity and impact.",
            href: paths.references,
            icon: "product-film",
          },
          {
            id: "viz3d",
            title: "3D Visualization",
            description:
              "Ideal for products still under development or difficult to photograph.",
            href: paths.references,
            icon: "viz3d",
          },
          {
            id: "animation",
            title: "3D Animation",
            description:
              "Explain complex technology with simple and engaging visual storytelling.",
            href: paths.references,
            icon: "animation",
          },
        ],
      },
      showreel: {
        label: "Showreel",
        headline: "Details that convince",
        body: "Precision made visible — product stories in photography, film and 3D.",
        cta: { label: "Watch showreel", href: paths.references },
        media: {
          src: "/images/product/Industriefilm.jpg",
          alt: "Product film production still",
          width: 1400,
          height: 933,
        },
      },
      projects: {
        label: "Selected projects",
        headline: "Selected projects",
        viewAll: { label: "View all projects", href: paths.references },
        items: [
          {
            id: "prod-1",
            title: "Product Communication",
            category: "Product Photography",
            href: paths.references,
            image: {
              src: "/images/product/Produktfotografie-scaled.jpg",
              alt: "Product photography project",
              width: 1200,
              height: 800,
            },
            isPlaceholder: true,
          },
          {
            id: "prod-2",
            title: "Product Communication",
            category: "Product Film",
            href: paths.references,
            image: {
              src: "/images/product/certina1.jpg",
              alt: "Product film project",
              width: 1200,
              height: 800,
            },
            isPlaceholder: true,
          },
          {
            id: "prod-3",
            title: "Product Communication",
            category: "3D Visualization",
            href: paths.references,
            image: {
              src: "/images/product/3D-Animation01.jpg",
              alt: "3D product visualization",
              width: 1200,
              height: 800,
            },
            isPlaceholder: true,
          },
          {
            id: "prod-4",
            title: "Product Communication",
            category: "Product Photography",
            href: paths.references,
            image: {
              src: "/images/product/Uhren_3-c83cc10e.jpg",
              alt: "Product still life",
              width: 1200,
              height: 800,
            },
            isPlaceholder: true,
          },
        ],
      },
      about: {
        label: "About Studiojeker",
        headline: "Strategy. Creativity. Production. Impact",
        headlineAccent: ".",
        subheadline: "",
        body: [
          "Since 1992, the partner for visual communication with substance and style. For brands that want to be seen.",
        ],
        cta: { label: "About us", href: paths.about },
        media: {
          src: "/images/product/Fotocomposing-725efaf0.jpg",
          alt: "Product production at Studiojeker",
          width: 1600,
          height: 1066,
        },
      },
      clients: { label: clientsLabel, logos: getClientLogos() },
      finalCta: {
        headlineBefore: "Let's make your product ",
        headlineAccent: "visible",
        headlineAfter: ".",
        text: "From product launch to international marketing, we create visual communication that helps your products stand out.",
        cta: { label: "Get in touch", href: paths.contact },
      },
    };
  }

  return {
    slug: "products-industry",
    seo: {
      title: "Produktfotografie, Produktvideos & 3D Visualisierung | Studiojeker",
      description:
        "Produktfotografie, Produktvideos, 3D-Visualisierungen und Animationen für Industrie, Technik und innovative Produkte.",
    },
    hero: {
      label: "Product Communication",
      headline: "Gute Produkte verdienen eine überzeugende Bühne",
      headlineAccent: ".",
      subheadline:
        "Wir entwickeln visuelle Kommunikation, die Produkte verständlich macht, Vertrauen schafft und den Verkauf unterstützt.",
      body: [
        "Ob neues Produkt, komplexe Maschine oder innovative Technologie – wir helfen Ihnen, die Stärken Ihres Produkts sichtbar zu machen.",
        "Mit professioneller Produktfotografie, Produktfilmen, 3D-Visualisierungen und Animationen entwickeln wir Inhalte, die begeistern und überzeugen.",
      ],
      primaryCta: { label: "Projekt besprechen", href: paths.contact },
      media: {
        src: "/images/product/Watch_3-057ab44a.jpg",
        alt: "Produktfotografie von Studiojeker",
        width: 1200,
        height: 800,
      },
    },
    solutions: {
      label: "Unsere Leistungen",
      headline: "Unsere Leistungen",
      items: [
        {
          id: "photo",
          title: "Produktfotografie",
          description:
            "Professionelle Bilder für Websites, Kataloge, Onlineshops und Marketingkampagnen.",
          href: paths.references,
          icon: "product-photo",
        },
        {
          id: "film",
          title: "Produktfilme",
          description:
            "Produkte in Bewegung – emotional, informativ und überzeugend.",
          href: paths.references,
          icon: "product-film",
        },
        {
          id: "viz3d",
          title: "3D-Visualisierungen",
          description:
            "Perfekt für Produkte, die noch in Entwicklung sind oder sich mit klassischer Fotografie nicht optimal darstellen lassen.",
          href: paths.references,
          icon: "viz3d",
        },
        {
          id: "animation",
          title: "3D-Animationen",
          description:
            "Komplexe Funktionen und technische Abläufe verständlich erklärt.",
          href: paths.references,
          icon: "animation",
        },
      ],
    },
    showreel: {
      label: "Showreel",
      headline: "Details, die überzeugen",
      body: "Präzision sichtbar machen — Produktgeschichten in Fotografie, Film und 3D.",
      cta: { label: "Showreel ansehen", href: paths.references },
      media: {
        src: "/images/product/Industriefilm.jpg",
        alt: "Produktfilm-Produktion",
        width: 1400,
        height: 933,
      },
    },
    projects: {
      label: "Ausgewählte Projekte",
      headline: "Ausgewählte Projekte",
      viewAll: { label: "Alle Projekte ansehen", href: paths.references },
      items: [
        {
          id: "prod-1",
          title: "Product Communication",
          category: "Produktfotografie",
          href: paths.references,
          image: {
            src: "/images/product/Produktfotografie-scaled.jpg",
            alt: "Produktfotografie-Projekt",
            width: 1200,
            height: 800,
          },
          isPlaceholder: true,
        },
        {
          id: "prod-2",
          title: "Product Communication",
          category: "Produktfilm",
          href: paths.references,
          image: {
            src: "/images/product/certina1.jpg",
            alt: "Produktfilm-Projekt",
            width: 1200,
            height: 800,
          },
          isPlaceholder: true,
        },
        {
          id: "prod-3",
          title: "Product Communication",
          category: "3D-Visualisierung",
          href: paths.references,
          image: {
            src: "/images/product/3D-Animation01.jpg",
            alt: "3D-Produktvisualisierung",
            width: 1200,
            height: 800,
          },
          isPlaceholder: true,
        },
        {
          id: "prod-4",
          title: "Product Communication",
          category: "Produktfotografie",
          href: paths.references,
          image: {
            src: "/images/product/Uhren_3-c83cc10e.jpg",
            alt: "Produktstillleben",
            width: 1200,
            height: 800,
          },
          isPlaceholder: true,
        },
      ],
    },
    about: {
      label: "Über Studiojeker",
      headline: "Strategie. Kreativität. Produktion. Wirkung",
      headlineAccent: ".",
      subheadline: "",
      body: [
        "Seit 1992 der Partner für visuelle Kommunikation mit Substanz und Stil. Für Marken, die gesehen werden wollen.",
      ],
      cta: { label: "Mehr über uns", href: paths.about },
      media: {
        src: "/images/product/Fotocomposing-725efaf0.jpg",
        alt: "Produktproduktion bei Studiojeker",
        width: 1600,
        height: 1066,
      },
    },
    clients: { label: clientsLabel, logos: getClientLogos() },
    finalCta: {
      headlineBefore: "Gemeinsam machen wir Ihr Produkt ",
      headlineAccent: "sichtbar",
      headlineAfter: ".",
      text: "Von der ersten Idee bis zur internationalen Markteinführung begleiten wir Unternehmen mit professioneller Produktkommunikation.",
      cta: { label: "Kontakt aufnehmen", href: paths.contact },
    },
  };
}
