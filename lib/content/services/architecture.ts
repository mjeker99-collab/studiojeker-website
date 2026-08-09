import type { Locale } from "@/types/i18n";
import type { ServicePageContent } from "@/types/service-page";
import { getClientLogos } from "@/lib/content/clients";
import { getServicePaths } from "@/lib/content/services/paths";

export function getArchitectureContent(locale: Locale): ServicePageContent {
  const paths = getServicePaths(locale);
  const clientsLabel =
    locale === "en" ? "Brands that trust us" : "Brands, die uns vertrauen";

  if (locale === "en") {
    return {
      slug: "architecture",
      seo: {
        title: "Architectural Visualization & Real Estate Marketing",
        description:
          "Architectural visualization, drone footage, virtual tours and premium marketing content for architects and real estate companies.",
      },
      hero: {
        label: "Architecture",
        headline: "Great architecture starts with inspiration",
        headlineAccent: ".",
        subheadline:
          "Architectural visualizations, animations and digital experiences for real estate projects.",
        body: [
          "Successful projects begin long before construction starts. Through photorealistic visualizations, animations, virtual tours and drone footage, we help architects, developers and real estate companies present their ideas with clarity and impact.",
        ],
        primaryCta: { label: "Let's talk", href: paths.contact },
        media: {
          src: "/images/architecture/hero-villa-master.jpg",
          alt: "Architectural visualization by Studiojeker",
          width: 1785,
          height: 1020,
        },
      },
      solutions: {
        label: "Our solutions",
        headline: "Our solutions",
        items: [
          {
            id: "viz",
            title: "Architectural Visualizations",
            description:
              "Photorealistic imagery for competitions, planning and marketing.",
            href: paths.references,
            icon: "architecture",
          },
          {
            id: "animation",
            title: "3D Animation",
            description:
              "Engaging animations that communicate architecture with emotion.",
            href: paths.references,
            icon: "animation",
          },
          {
            id: "drone",
            title: "Drone Footage",
            description:
              "Professional aerial imagery for architecture and real estate.",
            href: paths.references,
            icon: "drone",
          },
          {
            id: "tours",
            title: "Virtual Tours",
            description: "Allow clients to experience projects from anywhere.",
            href: paths.references,
            icon: "tour",
          },
        ],
      },
      showreel: {
        label: "Showreel",
        headline: "Spaces that inspire",
        body: "From first vision to marketing — architecture made visible before it is built.",
        cta: { label: "Watch showreel", href: paths.references },
        media: {
          src: "/images/architecture/Architekturvisualisierung.jpg",
          alt: "Architectural visualization showreel still",
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
            id: "arch-1",
            title: "Architecture",
            category: "Visualization",
            href: paths.references,
            image: {
              src: "/images/architecture/v5_02_korr.jpg",
              alt: "Architecture project visual",
              width: 1200,
              height: 800,
            },
            isPlaceholder: true,
          },
          {
            id: "arch-2",
            title: "Architecture",
            category: "3D Animation",
            href: paths.references,
            image: {
              src: "/images/architecture/3D_2.jpg",
              alt: "3D architecture project visual",
              width: 1200,
              height: 800,
            },
            isPlaceholder: true,
          },
          {
            id: "arch-3",
            title: "Architecture",
            category: "Real Estate",
            href: paths.references,
            image: {
              src: "/images/architecture/troesch4.jpg",
              alt: "Real estate project visual",
              width: 1200,
              height: 800,
            },
            isPlaceholder: true,
          },
          {
            id: "arch-4",
            title: "Architecture",
            category: "Visualization",
            href: paths.references,
            image: {
              src: "/images/architecture/IMG_9915.jpg",
              alt: "Architecture photography visual",
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
          src: "/images/architecture/v5_02_korr-1.jpg",
          alt: "Architecture production context",
          width: 1600,
          height: 1066,
        },
      },
      clients: { label: clientsLabel, logos: getClientLogos() },
      finalCta: {
        headlineBefore: "Let's talk about your ",
        headlineAccent: "project",
        headlineAfter: ".",
        text: "From the first visualization to the finished campaign — we create visibility across every channel.",
        cta: { label: "Get in touch", href: paths.contact },
      },
    };
  }

  return {
    slug: "architecture",
    seo: {
      title: "Architekturvisualisierung, Drohnen & Immobilienmarketing",
      description:
        "Fotorealistische Architekturvisualisierungen, Animationen, Drohnenaufnahmen und virtuelle Rundgänge für Architektur und Immobilien.",
    },
    hero: {
      label: "Architecture",
      headline: "Bevor Architektur entsteht, muss Begeisterung entstehen",
      headlineAccent: ".",
      subheadline:
        "Visualisierungen, Animationen und digitale Erlebnisse für Architektur- und Immobilienprojekte.",
      body: [
        "Erfolgreiche Projekte beginnen lange vor dem ersten Spatenstich. Mit fotorealistischen Visualisierungen, 3D-Animationen, virtuellen Rundgängen und Drohnenaufnahmen machen wir Architektur erlebbar – für Wettbewerbe, Investoren, Käufer und Vermarktung.",
      ],
      primaryCta: { label: "Projekt besprechen", href: paths.contact },
      media: {
        src: "/images/architecture/hero-villa-master.jpg",
        alt: "Architekturvisualisierung von Studiojeker",
        width: 1785,
        height: 1020,
      },
    },
    solutions: {
      label: "Unsere Leistungen",
      headline: "Unsere Leistungen",
      items: [
        {
          id: "viz",
          title: "Architekturvisualisierungen",
          description:
            "Fotorealistische Bilder für Wettbewerbe, Baueingaben und Vermarktung.",
          href: paths.references,
          icon: "architecture",
        },
        {
          id: "animation",
          title: "3D-Animationen",
          description:
            "Beeindruckende Filme, welche Architektur verständlich und emotional präsentieren.",
          href: paths.references,
          icon: "animation",
        },
        {
          id: "drone",
          title: "Drohnenaufnahmen",
          description:
            "Professionelle Luftaufnahmen für Architektur, Immobilien und Bauprojekte.",
          href: paths.references,
          icon: "drone",
        },
        {
          id: "tours",
          title: "Virtuelle Rundgänge",
          description: "Immobilien digital erleben – jederzeit und überall.",
          href: paths.references,
          icon: "tour",
        },
      ],
    },
    showreel: {
      label: "Showreel",
      headline: "Räume, die begeistern",
      body: "Von der ersten Vision bis zur Vermarktung — Architektur sichtbar, bevor sie gebaut wird.",
      cta: { label: "Showreel ansehen", href: paths.references },
      media: {
        src: "/images/architecture/Architekturvisualisierung.jpg",
        alt: "Architekturvisualisierung Showreel",
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
          id: "arch-1",
          title: "Architecture",
          category: "Visualisierung",
          href: paths.references,
          image: {
            src: "/images/architecture/v5_02_korr.jpg",
            alt: "Architektur-Projektvisual",
            width: 1200,
            height: 800,
          },
          isPlaceholder: true,
        },
        {
          id: "arch-2",
          title: "Architecture",
          category: "3D-Animation",
          href: paths.references,
          image: {
            src: "/images/architecture/3D_2.jpg",
            alt: "3D-Architektur-Projektvisual",
            width: 1200,
            height: 800,
          },
          isPlaceholder: true,
        },
        {
          id: "arch-3",
          title: "Architecture",
          category: "Immobilien",
          href: paths.references,
          image: {
            src: "/images/architecture/troesch4.jpg",
            alt: "Immobilien-Projektvisual",
            width: 1200,
            height: 800,
          },
          isPlaceholder: true,
        },
        {
          id: "arch-4",
          title: "Architecture",
          category: "Visualisierung",
          href: paths.references,
          image: {
            src: "/images/architecture/IMG_9915.jpg",
            alt: "Architekturfotografie-Visual",
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
        src: "/images/architecture/v5_02_korr-1.jpg",
        alt: "Architekturproduktion bei Studiojeker",
        width: 1600,
        height: 1066,
      },
    },
    clients: { label: clientsLabel, logos: getClientLogos() },
    finalCta: {
      headlineBefore: "Lassen Sie uns über Ihr ",
      headlineAccent: "Projekt",
      headlineAfter: " sprechen.",
      text: "Von der ersten Visualisierung bis zur fertigen Kommunikationskampagne schaffen wir Sichtbarkeit über alle Kanäle hinweg.",
      cta: { label: "Kontakt aufnehmen", href: paths.contact },
    },
  };
}
