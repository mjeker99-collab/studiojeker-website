import type { Locale } from "@/types/i18n";
import type { HomepageContent } from "@/types/homepage";
import { localizePathname } from "@/lib/i18n/config";

/**
 * Homepage content prepared for later WordPress REST replacement.
 * Copy sources: Website Texte D&E, SEO Titles&Metas, Developer Kit.
 * Mockup-only names/prices/projects are intentionally excluded.
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
        headline: "We Create Visibility",
        headlineAccent: ".",
        subheadline:
          "Your Visibility Partner for businesses, products and architecture.",
        body: [
          "Visibility doesn’t happen by chance.",
          "It is created when strategy, premium content and meaningful communication come together.",
          "Since 1992, we have helped businesses strengthen their brands, communicate products with clarity and bring projects to life.",
          "From the first idea to the final result.",
        ],
        primaryCta: { label: "Let's Talk", href: contact },
        secondaryCta: { label: "Explore our work", href: references },
        media: {
          src: "/images/architecture/Architekturvisualisierung.jpg",
          alt: "Architectural visualization by Studiojeker",
          width: 1600,
          height: 1200,
        },
      },
      services: {
        label: "Our solutions",
        headline: "How can we support you?",
        items: [
          {
            id: "architecture",
            title: "Architecture",
            description:
              "Every successful project starts with a vision. Photorealistic visualizations, animations and virtual tours help clients experience architecture before it is built.",
            href: architectureHref,
          },
          {
            id: "product",
            title: "Product Communication",
            description:
              "Communicate complex products with clarity. Photography, video and 3D solutions that explain products and support sales.",
            href: productHref,
          },
          {
            id: "business",
            title: "Business Communication",
            description:
              "Authentic communication for companies, organisations and brands. Business portraits, corporate films, explainer videos, employee photography and social media that build trust and strengthen your brand.",
            href: businessHref,
          },
          {
            id: "digital",
            title: "Digital Marketing",
            description:
              "Marketing strategy, websites, social media, newsletters and content marketing for sustainable business growth.",
            href: digitalHref,
          },
        ],
      },
      showreel: {
        label: "Showreel",
        headline: "Our work speaks for itself",
        body: "Short showreels, selected projects and case studies demonstrate how we help businesses, products and architecture become more visible.",
        cta: { label: "Explore our work", href: references },
        media: {
          src: "/images/Social marketing/Social marketing/Filmproduktionimg1.jpg",
          alt: "Film production at Studiojeker",
          width: 1600,
          height: 1066,
        },
      },
      projects: {
        label: "Selected work",
        headline: "Selected work",
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
        headline: "Visibility is not a project. It is a process.",
        introduction:
          "The Visibility Subscription offers businesses a long-term partnership for continuous communication. Planning, production, publishing and optimization from one partner.",
        cta: { label: "Discover Visibility Subscription", href: abo },
        benefits: [
          {
            id: "continuous",
            title: "Continuous visibility",
            description: "Professional content created on a regular basis.",
          },
          {
            id: "planning",
            title: "Predictable costs",
            description: "A clear content process with planable investment.",
          },
          {
            id: "quality",
            title: "Premium content",
            description: "Photography, film and digital content with one partner.",
          },
          {
            id: "focus",
            title: "One contact",
            description: "No internal production effort for your team.",
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
        headline: "More than 30 years of experience.",
        subheadline: "Personal. Creative. Reliable.",
        body: [
          "Studiojeker combines decades of experience with modern technology and a trusted network of specialists.",
          "As a small and dedicated team, we create premium communication solutions with a personal approach and a strong commitment to quality.",
        ],
        cta: { label: "About Studiojeker", href: about },
        media: {
          src: "/images/business/Industrie_5-fb0c83d5.jpg",
          alt: "Studiojeker production environment",
          width: 1600,
          height: 1066,
        },
      },
      clients: {
        label: "Selected clients",
        logos: getClientLogos(),
      },
      finalCta: {
        headlineBefore: "Let's create ",
        headlineAccent: "visibility",
        headlineAfter: " together.",
        text: "Whether you are looking for business communication, product marketing or architectural visualization, we would love to hear about your project.",
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
      headline: "We Create Visibility",
      headlineAccent: ".",
      subheadline:
        "Ihr Visibility Partner für Unternehmen, Produkte und Architektur.",
      body: [
        "Sichtbarkeit entsteht nicht durch Zufall.",
        "Sie entsteht, wenn Strategie, hochwertiger Content und die richtige Kommunikation zusammenkommen.",
        "Seit 1992 begleiten wir Unternehmen dabei, ihre Marke zu stärken, Produkte überzeugend zu präsentieren und Projekte erlebbar zu machen.",
        "Von der ersten Idee bis zur erfolgreichen Umsetzung.",
      ],
      primaryCta: { label: "Projekt besprechen", href: contact },
      secondaryCta: { label: "Unsere Arbeiten entdecken", href: references },
      media: {
        src: "/images/architecture/Architekturvisualisierung.jpg",
        alt: "Architekturvisualisierung von Studiojeker",
        width: 1600,
        height: 1200,
      },
    },
    services: {
      label: "Unsere Leistungen",
      headline: "Wobei dürfen wir Sie unterstützen?",
      items: [
        {
          id: "architecture",
          title: "Architecture",
          description:
            "Architektur beginnt mit einer Vision. Fotorealistische Visualisierungen, Animationen und virtuelle Rundgänge machen Projekte bereits vor ihrer Realisierung erlebbar.",
          href: architectureHref,
        },
        {
          id: "product",
          title: "Product Communication",
          description:
            "Komplexe Produkte verständlich kommunizieren. Mit Fotografie, Film und 3D entwickeln wir Inhalte, die Produkte erklären, begeistern und den Vertrieb unterstützen.",
          href: productHref,
        },
        {
          id: "business",
          title: "Business Communication",
          description:
            "Authentische Kommunikation für Unternehmen, Organisationen und Marken. Businessportraits, Unternehmensfilme, Erklärvideos, Mitarbeiterfotografie und Social Media schaffen Vertrauen und geben Ihrem Unternehmen ein Gesicht.",
          href: businessHref,
        },
        {
          id: "digital",
          title: "Digital Marketing",
          description:
            "Marketingstrategien, Social Media, Websites, Newsletter und Content-Marketing für nachhaltige Sichtbarkeit und mehr Reichweite.",
          href: digitalHref,
        },
      ],
    },
    showreel: {
      label: "Showreel",
      headline: "Unsere Arbeiten sprechen für sich",
      body: "Kurze Showreels, ausgewählte Referenzen und Case Studies zeigen, wie wir Unternehmen, Produkte und Architektur sichtbar machen.",
      cta: { label: "Unsere Arbeiten entdecken", href: references },
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
      headline: "Sichtbarkeit ist kein Projekt. Sie ist ein Prozess.",
      introduction:
        "Sichtbarkeit im Abo bietet Unternehmen eine langfristige Partnerschaft für kontinuierliche Kommunikation. Planung, Produktion, Publishing und Optimierung aus einer Hand.",
      cta: { label: "Abo entdecken", href: abo },
      benefits: [
        {
          id: "continuous",
          title: "Kontinuierliche Sichtbarkeit",
          description: "Professioneller Content entsteht regelmässig.",
        },
        {
          id: "planning",
          title: "Planbare Kosten",
          description: "Ein klarer Content-Prozess mit planbarem Aufwand.",
        },
        {
          id: "quality",
          title: "Professioneller Content",
          description: "Foto, Film und digitaler Content mit einem Partner.",
        },
        {
          id: "focus",
          title: "Ein Ansprechpartner",
          description: "Kein interner Produktionsaufwand für Ihr Team.",
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
      headline: "Mehr als 30 Jahre Erfahrung.",
      subheadline: "Persönlich. Kreativ. Zuverlässig.",
      body: [
        "Studiojeker verbindet langjährige Erfahrung mit modernster Technologie und einem starken Partnernetzwerk.",
        "Mit einem kleinen, engagierten Team entwickeln wir hochwertige Kommunikationslösungen – flexibel, persönlich und mit dem Anspruch, jedes Projekt zu etwas Besonderem zu machen.",
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
      label: "Ausgewählte Kunden",
      logos: getClientLogos(),
    },
    finalCta: {
      headlineBefore: "Lassen Sie uns über Ihr Projekt sprechen",
      headlineAccent: ".",
      headlineAfter: "",
      text: "Ganz gleich, ob Unternehmenskommunikation, Produktmarketing oder Architekturprojekt – gemeinsam entwickeln wir Lösungen, die nachhaltig wirken und Sichtbarkeit schaffen.",
      cta: { label: "Kontakt aufnehmen", href: contact },
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
    {
      id: "scott",
      name: "Scott",
      src: "/images/Client logos/Scott-2.svg",
      width: 120,
      height: 48,
    },
    {
      id: "eta",
      name: "ETA",
      src: "/images/Client logos/ETA-2.svg",
      width: 100,
      height: 48,
    },
  ];
}
