import type { Locale } from "@/types/i18n";
import type { ServicePageContent } from "@/types/service-page";
import { getClientLogos } from "@/lib/content/clients";
import { getServicePaths } from "@/lib/content/services/paths";

/**
 * Digital Marketing — SEO + kit §10 outline.
 * Full Website Texte body for this page is not yet available in sources.
 */
export function getDigitalMarketingContent(locale: Locale): ServicePageContent {
  const paths = getServicePaths(locale);
  const clientsLabel =
    locale === "en" ? "Brands that trust us" : "Brands, die uns vertrauen";

  if (locale === "en") {
    return {
      slug: "digital-marketing",
      seo: {
        title: "Marketing Strategy, Social Media & Content Marketing",
        description:
          "Marketing strategy, websites, social media, newsletters and content marketing for sustainable business growth.",
      },
      hero: {
        label: "Digital Marketing",
        headline: "Turn attention into action",
        headlineAccent: ".",
        subheadline: "Continuous content. Continuous visibility.",
        body: [
          "Visibility requires consistency. We connect strategy, content production and distribution — so brands stay present where it matters.",
        ],
        primaryCta: { label: "Let's talk", href: paths.contact },
        media: {
          src: "/images/Social marketing/Social marketing/Zofingen-0279-b9bf2eb3.jpg",
          alt: "Digital content production by Studiojeker",
          width: 1400,
          height: 933,
        },
      },
      solutions: {
        label: "Our solutions",
        headline: "Our solutions",
        items: [
          {
            id: "strategy",
            title: "Content Strategy",
            description:
              "Clear positioning, editorial planning and channel strategy for lasting visibility.",
            href: paths.contact,
            icon: "strategy",
          },
          {
            id: "content",
            title: "Content Production",
            description:
              "Photography, video, reels and copy — produced for digital channels.",
            href: paths.references,
            icon: "content",
          },
          {
            id: "social",
            title: "Social Media",
            description:
              "Publishing and presence on LinkedIn, Instagram and further platforms.",
            href: paths.references,
            icon: "social",
          },
          {
            id: "abo",
            title: "Visibility Subscription",
            description:
              "Continuous content. Predictable costs. Visibility as a process — not a one-off project.",
            href: paths.abo,
            icon: "abo",
          },
        ],
      },
      showreel: {
        label: "Showreel",
        headline: "Content that stays present",
        body: "From idea to distribution — content that builds reach and relevance over time.",
        cta: { label: "Watch showreel", href: paths.references },
        media: {
          src: "/images/Social marketing/Social marketing/Filmproduktionimg1.jpg",
          alt: "Content production showreel still",
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
            id: "dig-1",
            title: "Digital Marketing",
            category: "Content",
            href: paths.references,
            image: {
              src: "/images/Social marketing/Social marketing/PHOTO-2023-05-11-15-00-27.jpg",
              alt: "Content marketing project visual",
              width: 1200,
              height: 800,
            },
            isPlaceholder: true,
          },
          {
            id: "dig-2",
            title: "Digital Marketing",
            category: "Social Media",
            href: paths.references,
            image: {
              src: "/images/Social marketing/Social marketing/Eventfotografie-2-a35bdf37.jpg",
              alt: "Social media project visual",
              width: 1200,
              height: 800,
            },
            isPlaceholder: true,
          },
          {
            id: "dig-3",
            title: "Digital Marketing",
            category: "Strategy",
            href: paths.references,
            image: {
              src: "/images/Social marketing/Social marketing/Screenshot-2022-11-04-104711-1.png",
              alt: "Digital strategy project visual",
              width: 1200,
              height: 800,
            },
            isPlaceholder: true,
          },
          {
            id: "dig-4",
            title: "Digital Marketing",
            category: "Content",
            href: paths.abo,
            image: {
              src: "/images/business/Business_15-c86517b0.jpg",
              alt: "Visibility subscription visual",
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
          src: "/images/business/Industrie_1-1dfc4e3a.jpg",
          alt: "Studiojeker content team at work",
          width: 1600,
          height: 1066,
        },
      },
      clients: { label: clientsLabel, logos: getClientLogos() },
      finalCta: {
        headlineBefore: "Start your ",
        headlineAccent: "visibility",
        headlineAfter: " journey.",
        text: "We look forward to building consistent presence with you.",
        cta: { label: "Get in touch", href: paths.contact },
      },
    };
  }

  return {
    slug: "digital-marketing",
    seo: {
      title: "Marketingstrategie, Social Media & Content Marketing",
      description:
        "Marketingstrategien, Social Media, Websites, Newsletter und Content-Marketing für nachhaltige Sichtbarkeit und mehr Reichweite.",
    },
    hero: {
      label: "Digital Marketing",
      headline: "Aus Aufmerksamkeit wird Wirkung",
      headlineAccent: ".",
      subheadline: "Kontinuierlicher Content. Kontinuierliche Sichtbarkeit.",
      body: [
        "Sichtbarkeit braucht Kontinuität. Wir verbinden Strategie, Content-Produktion und Distribution — damit Marken dort präsent bleiben, wo es zählt.",
      ],
      primaryCta: { label: "Projekt besprechen", href: paths.contact },
      media: {
        src: "/images/Social marketing/Social marketing/Zofingen-0279-b9bf2eb3.jpg",
        alt: "Digitale Content-Produktion von Studiojeker",
        width: 1400,
        height: 933,
      },
    },
    solutions: {
      label: "Unsere Leistungen",
      headline: "Unsere Leistungen",
      items: [
        {
          id: "strategy",
          title: "Content-Strategie",
          description:
            "Klare Positionierung, redaktionelle Planung und Kanalstrategie für nachhaltige Sichtbarkeit.",
          href: paths.contact,
          icon: "strategy",
        },
        {
          id: "content",
          title: "Content-Produktion",
          description:
            "Fotografie, Video, Reels und Texte — produziert für digitale Kanäle.",
          href: paths.references,
          icon: "content",
        },
        {
          id: "social",
          title: "Social Media",
          description:
            "Publishing und Präsenz auf LinkedIn, Instagram und weiteren Plattformen.",
          href: paths.references,
          icon: "social",
        },
        {
          id: "abo",
          title: "Sichtbarkeit im Abo",
          description:
            "Kontinuierlicher Content. Planbare Kosten. Sichtbarkeit als Prozess — nicht als Einzelprojekt.",
          href: paths.abo,
          icon: "abo",
        },
      ],
    },
    showreel: {
      label: "Showreel",
      headline: "Content, der präsent bleibt",
      body: "Von der Idee bis zur Distribution — Inhalte, die Reichweite und Relevanz über die Zeit aufbauen.",
      cta: { label: "Showreel ansehen", href: paths.references },
      media: {
        src: "/images/Social marketing/Social marketing/Filmproduktionimg1.jpg",
        alt: "Content-Produktion Showreel",
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
          id: "dig-1",
          title: "Digital Marketing",
          category: "Content",
          href: paths.references,
          image: {
            src: "/images/Social marketing/Social marketing/PHOTO-2023-05-11-15-00-27.jpg",
            alt: "Content-Marketing-Projektvisual",
            width: 1200,
            height: 800,
          },
          isPlaceholder: true,
        },
        {
          id: "dig-2",
          title: "Digital Marketing",
          category: "Social Media",
          href: paths.references,
          image: {
            src: "/images/Social marketing/Social marketing/Eventfotografie-2-a35bdf37.jpg",
            alt: "Social-Media-Projektvisual",
            width: 1200,
            height: 800,
          },
          isPlaceholder: true,
        },
        {
          id: "dig-3",
          title: "Digital Marketing",
          category: "Strategie",
          href: paths.references,
          image: {
            src: "/images/Social marketing/Social marketing/Screenshot-2022-11-04-104711-1.png",
            alt: "Digitale-Strategie-Projektvisual",
            width: 1200,
            height: 800,
          },
          isPlaceholder: true,
        },
        {
          id: "dig-4",
          title: "Digital Marketing",
          category: "Sichtbarkeit im Abo",
          href: paths.abo,
          image: {
            src: "/images/business/Business_15-c86517b0.jpg",
            alt: "Sichtbarkeit-im-Abo-Visual",
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
        src: "/images/business/Industrie_1-1dfc4e3a.jpg",
        alt: "Studiojeker Content-Team bei der Arbeit",
        width: 1600,
        height: 1066,
      },
    },
    clients: { label: clientsLabel, logos: getClientLogos() },
    finalCta: {
      headlineBefore: "Starten Sie Ihre ",
      headlineAccent: "Sichtbarkeit",
      headlineAfter: ".",
      text: "Wir freuen uns darauf, mit Ihnen kontinuierliche Präsenz aufzubauen.",
      cta: { label: "Kontakt aufnehmen", href: paths.contact },
    },
  };
}
