import type { Locale } from "@/types/i18n";
import type { ServicePageContent } from "@/types/service-page";
import { getClientLogos } from "@/lib/content/clients";
import { getServicePaths } from "@/lib/content/services/paths";

/** Content from Website Texte D&E_2026 + SEO Titles&Metas (kit-aligned). */
export function getBusinessCommunicationContent(
  locale: Locale,
): ServicePageContent {
  const paths = getServicePaths(locale);
  const clientsLabel =
    locale === "en" ? "Brands that trust us" : "Brands, die uns vertrauen";

  if (locale === "en") {
    return {
      slug: "business-communication",
      seo: {
        title: "Corporate Films, Business Portraits & Explainer Videos",
        description:
          "Corporate films, business portraits, explainer videos and social media content for companies, organisations and premium brands.",
      },
      hero: {
        label: "Business Communication",
        headline: "People build trust. Communication builds relationships",
        headlineAccent: ".",
        subheadline:
          "Authentic communication for businesses, organisations and brands.",
        body: [
          "First impressions matter.",
          "Through business portraits, corporate films, explainer videos, employee photography and social media, we help organisations present themselves professionally, build trust and increase their visibility.",
        ],
        primaryCta: { label: "Let's talk", href: paths.contact },
        media: {
          src: "/images/business/Business_3-e21f49d5.jpg",
          alt: "Business film production by Studiojeker",
          width: 1200,
          height: 800,
        },
      },
      solutions: {
        label: "Our solutions",
        headline: "Our solutions",
        items: [
          {
            id: "corporate-films",
            title: "Corporate Films",
            description:
              "Authentic storytelling for companies and organisations.",
            href: paths.references,
            icon: "film",
          },
          {
            id: "portraits",
            title: "Business Portraits",
            description:
              "Professional portraits for executives, teams and employees.",
            href: paths.references,
            icon: "portrait",
          },
          {
            id: "reportage",
            title: "Reportage",
            description:
              "Real people. Real stories. For websites, recruitment and employer branding.",
            href: paths.references,
            icon: "reportage",
          },
          {
            id: "internal",
            title: "Internal & Communication",
            description:
              "Consistent content for LinkedIn, Instagram, Facebook and other platforms.",
            href: paths.references,
            icon: "internal",
          },
        ],
      },
      showreel: {
        label: "Showreel",
        headline: "Stories that move",
        body: "Moving images are our passion. Discover a selection of recent business communication projects.",
        cta: { label: "Watch showreel", href: paths.references },
        media: {
          src: "/images/business/Hamilton_Services3861-1d4705bb.jpg",
          alt: "Behind the scenes of a Studiojeker film production",
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
            id: "biz-1",
            title: "Business Communication",
            category: "Corporate Film",
            href: paths.references,
            image: {
              src: "/images/business/Business_1-03e4abec.jpg",
              alt: "Business Communication project visual",
              width: 1200,
              height: 800,
            },
            isPlaceholder: true,
          },
          {
            id: "biz-2",
            title: "Business Communication",
            category: "Business Portrait",
            href: paths.references,
            image: {
              src: "/images/business/Business_4-22cbf9b5.jpg",
              alt: "Business portrait project visual",
              width: 1200,
              height: 800,
            },
            isPlaceholder: true,
          },
          {
            id: "biz-3",
            title: "Business Communication",
            category: "Reportage",
            href: paths.references,
            image: {
              src: "/images/business/Reportage_21-d196d171.jpg",
              alt: "Reportage project visual",
              width: 1200,
              height: 800,
            },
            isPlaceholder: true,
          },
          {
            id: "biz-4",
            title: "Business Communication",
            category: "Corporate Film",
            href: paths.references,
            image: {
              src: "/images/business/Reportage_9-cb3c2e4c.jpg",
              alt: "Corporate storytelling project visual",
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
          src: "/images/business/Industrie_5-fb0c83d5.jpg",
          alt: "Production at Studiojeker",
          width: 1600,
          height: 1066,
        },
      },
      clients: { label: clientsLabel, logos: getClientLogos() },
      finalCta: {
        headlineBefore: "Let's create ",
        headlineAccent: "visibility",
        headlineAfter: " together.",
        text: "Let's talk about your organisation, your goals and how we can help you communicate with clarity and confidence.",
        cta: { label: "Get in touch", href: paths.contact },
      },
    };
  }

  return {
    slug: "business-communication",
    seo: {
      title: "Unternehmensfilme, Businessportraits & Erklärvideos | Studiojeker",
      description:
        "Businessportraits, Unternehmensfilme, Erklärvideos, Mitarbeiterfotografie und Social Media für Unternehmen, Organisationen und Marken.",
    },
    hero: {
      label: "Business Communication",
      headline: "Menschen schaffen Vertrauen. Kommunikation schafft Beziehungen",
      headlineAccent: ".",
      subheadline:
        "Authentische Unternehmenskommunikation für Unternehmen, Organisationen und Marken.",
      body: [
        "Der erste Eindruck entscheidet oft über den weiteren Verlauf einer Geschäftsbeziehung.",
        "Mit professionellen Businessportraits, Unternehmensfilmen, Erklärvideos, Mitarbeiterfotografie und Social Media unterstützen wir Unternehmen dabei, Persönlichkeit zu zeigen, Vertrauen aufzubauen und nachhaltig sichtbar zu werden.",
      ],
      primaryCta: { label: "Projekt besprechen", href: paths.contact },
      media: {
        src: "/images/business/Business_3-e21f49d5.jpg",
        alt: "Business-Filmproduktion von Studiojeker",
        width: 1200,
        height: 800,
      },
    },
    solutions: {
      label: "Unsere Leistungen",
      headline: "Unsere Leistungen",
      items: [
        {
          id: "corporate-films",
          title: "Unternehmensfilme",
          description:
            "Authentische Filme, die Ihr Unternehmen, Ihre Kultur und Ihre Leistungen sichtbar machen.",
          href: paths.references,
          icon: "film",
        },
        {
          id: "portraits",
          title: "Businessporträts",
          description:
            "Professionelle Portraits für Geschäftsleitung, Mitarbeitende und Teams.",
          href: paths.references,
          icon: "portrait",
        },
        {
          id: "reportage",
          title: "Reportagen",
          description:
            "Echte Menschen. Echte Geschichten. Für Website, Recruiting und Employer Branding.",
          href: paths.references,
          icon: "reportage",
        },
        {
          id: "internal",
          title: "Intern & Kommunikation",
          description:
            "Kontinuierlicher Content für LinkedIn, Instagram, Facebook und weitere Plattformen.",
          href: paths.references,
          icon: "internal",
        },
      ],
    },
    showreel: {
      label: "Showreel",
      headline: "Stories, die bewegen",
      body: "Bewegtbild ist unsere Leidenschaft. Entdecken Sie eine Auswahl unserer Business-Communication-Projekte.",
      cta: { label: "Showreel ansehen", href: paths.references },
      media: {
        src: "/images/business/Hamilton_Services3861-1d4705bb.jpg",
        alt: "Behind the scenes einer Studiojeker-Filmproduktion",
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
          id: "biz-1",
          title: "Business Communication",
          category: "Unternehmensfilm",
          href: paths.references,
          image: {
            src: "/images/business/Business_1-03e4abec.jpg",
            alt: "Business-Communication-Projektvisual",
            width: 1200,
            height: 800,
          },
          isPlaceholder: true,
        },
        {
          id: "biz-2",
          title: "Business Communication",
          category: "Businessporträt",
          href: paths.references,
          image: {
            src: "/images/business/Business_4-22cbf9b5.jpg",
            alt: "Businessporträt-Projektvisual",
            width: 1200,
            height: 800,
          },
          isPlaceholder: true,
        },
        {
          id: "biz-3",
          title: "Business Communication",
          category: "Reportage",
          href: paths.references,
          image: {
            src: "/images/business/Reportage_21-d196d171.jpg",
            alt: "Reportage-Projektvisual",
            width: 1200,
            height: 800,
          },
          isPlaceholder: true,
        },
        {
          id: "biz-4",
          title: "Business Communication",
          category: "Unternehmensfilm",
          href: paths.references,
          image: {
            src: "/images/business/Reportage_9-cb3c2e4c.jpg",
            alt: "Corporate-Storytelling-Projektvisual",
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
        src: "/images/business/Industrie_5-fb0c83d5.jpg",
        alt: "Produktion bei Studiojeker",
        width: 1600,
        height: 1066,
      },
    },
    clients: { label: clientsLabel, logos: getClientLogos() },
    finalCta: {
      headlineBefore: "Sichtbarkeit beginnt mit einem ",
      headlineAccent: "Gespräch",
      headlineAfter: ".",
      text: "Gemeinsam entwickeln wir Kommunikationslösungen, die Vertrauen schaffen und Ihre Organisation nachhaltig sichtbar machen.",
      cta: { label: "Kontakt aufnehmen", href: paths.contact },
    },
  };
}
