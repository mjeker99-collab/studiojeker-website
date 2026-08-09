import type { Locale } from "@/types/i18n";
import type { HomepageContent } from "@/types/homepage";
import { localizePathname } from "@/lib/i18n/config";

/**
 * Homepage content prepared for later WordPress REST replacement.
 * Visual structure follows approved homepage master mockup.
 * Project titles remain placeholders until approved WordPress content exists.
 */
export function getHomepageContent(locale: Locale): HomepageContent {
  const contact = localizePathname("/contact", locale);
  const references = localizePathname("/references", locale);
  const about = localizePathname("/about", locale);
  const abo = localizePathname("/solutions/sichtbarkeit-im-abo", locale);

  const architectureHref = localizePathname(
    "/solutions/architecture-real-estate",
    locale,
  );
  const productHref = localizePathname("/solutions/products-industry", locale);
  const businessHref = localizePathname("/solutions/brand-business", locale);
  const digitalHref = localizePathname(
    "/solutions/social-digital-marketing",
    locale,
  );

  if (locale === "en") {
    return {
      seo: {
        title: "Studiojeker | Photography, Film, 3D & Marketing Solutions",
        description:
          "Since 1992 Studiojeker has created photography, film, 3D visualization and marketing solutions for businesses, products and architecture.",
      },
      hero: {
        headline: "We create visibility",
        headlineAccent: ".",
        subheadline: "Photo. Video. 3D. Content. Strategy. Distribution.",
        body: [
          "We stage brands, products and architecture — visually strong, strategically considered, effectively executed.",
        ],
        primaryCta: { label: "View our work", href: references },
        media: {
          src: "/images/architecture/Architekturvisualisierung.jpg",
          alt: "Architectural visualization by Studiojeker",
          width: 1600,
          height: 1200,
        },
      },
      services: {
        label: "Our services",
        headline: "Our services",
        items: [
          {
            id: "architecture",
            title: "Architecture",
            description:
              "3D visualizations, animations and drone footage for architecture and real estate.",
            href: architectureHref,
          },
          {
            id: "product",
            title: "Product Communication",
            description:
              "Product photography, video and 3D for convincing products and brands.",
            href: productHref,
          },
          {
            id: "business",
            title: "Business Communication",
            description:
              "Corporate films, portraits and reportage that make values visible.",
            href: businessHref,
          },
          {
            id: "digital",
            title: "Digital Marketing",
            description:
              "Strategy, content and social media for more reach and results.",
            href: digitalHref,
          },
        ],
      },
      showreel: {
        label: "Showreel",
        headline: "Stories that move",
        body: "Moving images are our passion. Discover a selection of our latest projects.",
        cta: { label: "Watch showreel", href: references },
        media: {
          src: "/images/Social marketing/Social marketing/Filmproduktionimg1.jpg",
          alt: "Film production at Studiojeker",
          width: 1600,
          height: 1066,
        },
      },
      projects: {
        label: "Selected projects",
        headline: "Selected projects",
        viewAll: { label: "View all projects", href: references },
        items: [
          {
            id: "placeholder-architecture",
            title: "[Project placeholder]",
            category: "Architecture",
            href: references,
            image: {
              src: "/images/architecture/v5_02_korr.jpg",
              alt: "Architecture project placeholder image",
              width: 1200,
              height: 800,
            },
            isPlaceholder: true,
          },
          {
            id: "placeholder-product",
            title: "[Project placeholder]",
            category: "Product Communication",
            href: references,
            image: {
              src: "/images/product/Watch_3-057ab44a.jpg",
              alt: "Product communication placeholder image",
              width: 1200,
              height: 800,
            },
            isPlaceholder: true,
          },
          {
            id: "placeholder-business",
            title: "[Project placeholder]",
            category: "Business Communication",
            href: references,
            image: {
              src: "/images/business/Business_3-e21f49d5.jpg",
              alt: "Business communication placeholder image",
              width: 1200,
              height: 800,
            },
            isPlaceholder: true,
          },
          {
            id: "placeholder-digital",
            title: "[Project placeholder]",
            category: "Digital Marketing",
            href: references,
            image: {
              src: "/images/Social marketing/Social marketing/Zofingen-0279-b9bf2eb3.jpg",
              alt: "Digital marketing placeholder image",
              width: 1200,
              height: 800,
            },
            isPlaceholder: true,
          },
        ],
      },
      abo: {
        headline: "Visibility subscription",
        introduction: "Continuous content. Predictable costs.",
        cta: { label: "Discover subscription", href: abo },
        benefits: [
          {
            id: "continuous",
            title: "Continuous content",
            description: "Professional content created on a regular basis.",
          },
          {
            id: "system",
            title: "One system",
            description: "Planning, production and publishing from one partner.",
          },
          {
            id: "visibility",
            title: "More visibility",
            description: "Presence that builds over time — not by chance.",
          },
          {
            id: "planning",
            title: "Predictable costs",
            description: "A clear content process with planable investment.",
          },
        ],
        media: {
          src: "/images/Social marketing/Social marketing/PHOTO-2023-05-11-15-00-27.jpg",
          alt: "Studiojeker content production context",
          width: 1200,
          height: 900,
        },
      },
      about: {
        label: "About Studiojeker",
        headline: "Strategy. Creativity. Production. Impact",
        headlineAccent: ".",
        subheadline: "",
        body: [
          "Since 1992 the partner for visual communication with substance and style. For brands that want to be seen.",
        ],
        cta: { label: "About us", href: about },
        media: {
          src: "/images/business/Industrie_5-fb0c83d5.jpg",
          alt: "Studiojeker production environment",
          width: 1600,
          height: 1066,
        },
      },
      clients: {
        label: "Brands that trust us",
        logos: getClientLogos(),
      },
      finalCta: {
        headlineBefore: "Let’s create ",
        headlineAccent: "visibility",
        headlineAfter: " together.",
        text: "We look forward to your project.",
        cta: { label: "Get in touch", href: contact },
      },
    };
  }

  return {
    seo: {
      title: "Studiojeker | Foto, Film, 3D & Marketing für Unternehmen",
      description:
        "Studiojeker entwickelt seit 1992 Foto-, Film-, 3D- und Marketinglösungen für Unternehmen, Produkte und Architektur. We Create Visibility.",
    },
    hero: {
      headline: "We create visibility",
      headlineAccent: ".",
      subheadline: "Photo. Video. 3D. Content. Strategy. Distribution.",
      body: [
        "Wir inszenieren Marken, Produkte und Architektur – visuell stark, strategisch durchdacht, wirkungsvoll umgesetzt.",
      ],
      primaryCta: { label: "Unsere Arbeit ansehen", href: references },
      media: {
        src: "/images/architecture/Architekturvisualisierung.jpg",
        alt: "Architekturvisualisierung von Studiojeker",
        width: 1600,
        height: 1200,
      },
    },
    services: {
      label: "Unsere Leistungen",
      headline: "Unsere Leistungen",
      items: [
        {
          id: "architecture",
          title: "Architecture",
          description:
            "3D-Visualisierungen, Animationen und Drohnenaufnahmen für Architektur und Immobilien.",
          href: architectureHref,
        },
        {
          id: "product",
          title: "Product Communication",
          description:
            "Produktfotografie, Videos und 3D für überzeugende Produkte und Marken.",
          href: productHref,
        },
        {
          id: "business",
          title: "Business Communication",
          description:
            "Unternehmensfilme, Porträts und Reportagen, die Werte sichtbar machen.",
          href: businessHref,
        },
        {
          id: "digital",
          title: "Digital Marketing",
          description:
            "Strategie, Content und Social Media für mehr Reichweite und Resultate.",
          href: digitalHref,
        },
      ],
    },
    showreel: {
      label: "Showreel",
      headline: "Stories, die bewegen",
      body: "Bewegtbild ist unsere Leidenschaft. Entdecken Sie eine Auswahl unserer neuesten Projekte.",
      cta: { label: "Showreel ansehen", href: references },
      media: {
        src: "/images/Social marketing/Social marketing/Filmproduktionimg1.jpg",
        alt: "Filmproduktion bei Studiojeker",
        width: 1600,
        height: 1066,
      },
    },
    projects: {
      label: "Ausgewählte Projekte",
      headline: "Ausgewählte Projekte",
      viewAll: { label: "Alle Projekte ansehen", href: references },
      items: [
        {
          id: "placeholder-architecture",
          title: "[Projektplatzhalter]",
          category: "Architecture",
          href: references,
          image: {
            src: "/images/architecture/v5_02_korr.jpg",
            alt: "Platzhalterbild Architektur",
            width: 1200,
            height: 800,
          },
          isPlaceholder: true,
        },
        {
          id: "placeholder-product",
          title: "[Projektplatzhalter]",
          category: "Product Communication",
          href: references,
          image: {
            src: "/images/product/Watch_3-057ab44a.jpg",
            alt: "Platzhalterbild Product Communication",
            width: 1200,
            height: 800,
          },
          isPlaceholder: true,
        },
        {
          id: "placeholder-business",
          title: "[Projektplatzhalter]",
          category: "Business Communication",
          href: references,
          image: {
            src: "/images/business/Business_3-e21f49d5.jpg",
            alt: "Platzhalterbild Business Communication",
            width: 1200,
            height: 800,
          },
          isPlaceholder: true,
        },
        {
          id: "placeholder-digital",
          title: "[Projektplatzhalter]",
          category: "Digital Marketing",
          href: references,
          image: {
            src: "/images/Social marketing/Social marketing/Zofingen-0279-b9bf2eb3.jpg",
            alt: "Platzhalterbild Digital Marketing",
            width: 1200,
            height: 800,
          },
          isPlaceholder: true,
        },
      ],
    },
    abo: {
      headline: "Sichtbarkeit im Abo",
      introduction: "Kontinuierlicher Content. Planbare Kosten.",
      cta: { label: "Abo entdecken", href: abo },
      benefits: [
        {
          id: "continuous",
          title: "Kontinuierlicher Content",
          description: "Professioneller Content entsteht regelmässig.",
        },
        {
          id: "system",
          title: "Ein System",
          description: "Planung, Produktion und Publishing aus einer Hand.",
        },
        {
          id: "visibility",
          title: "Mehr Sichtbarkeit",
          description: "Präsenz, die wächst — nicht durch Zufall.",
        },
        {
          id: "planning",
          title: "Planbare Kosten",
          description: "Ein klarer Content-Prozess mit planbarem Aufwand.",
        },
      ],
      media: {
        src: "/images/Social marketing/Social marketing/PHOTO-2023-05-11-15-00-27.jpg",
        alt: "Studiojeker Content-Produktion",
        width: 1200,
        height: 900,
      },
    },
    about: {
      label: "Über Studiojeker",
      headline: "Strategie. Kreativität. Produktion. Wirkung",
      headlineAccent: ".",
      subheadline: "",
      body: [
        "Seit 1992 der Partner für visuelle Kommunikation mit Substanz und Stil. Für Marken, die gesehen werden wollen.",
      ],
      cta: { label: "Mehr über uns", href: about },
      media: {
        src: "/images/business/Industrie_5-fb0c83d5.jpg",
        alt: "Produktion bei Studiojeker",
        width: 1600,
        height: 1066,
      },
    },
    clients: {
      label: "Brands, die uns vertrauen",
      logos: getClientLogos(),
    },
    finalCta: {
      headlineBefore: "Lassen Sie uns gemeinsam ",
      headlineAccent: "Sichtbarkeit",
      headlineAfter: " schaffen.",
      text: "Wir freuen uns auf Ihr Projekt.",
      cta: { label: "Jetzt Kontakt aufnehmen", href: contact },
    },
  };
}

function getClientLogos() {
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
