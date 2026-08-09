import type { Locale } from "@/types/i18n";
import { localizePathname } from "@/lib/i18n/config";
import { getServicePaths } from "@/lib/content/services/paths";
import { getClientLogos } from "@/lib/content/clients";
import type { HomepageClientLogo } from "@/types/homepage";

export type AboutPageContent = {
  seo: { title: string; description: string };
  hero: {
    label: string;
    headline: string;
    subheadline: string;
    body: string[];
    cta: { label: string; href: string };
    media: { src: string; alt: string; width: number; height: number };
  };
  story: {
    label: string;
    headline: string;
    body: string[];
  };
  services: {
    label: string;
    headline: string;
    text: string;
    items: Array<{ id: string; title: string; href: string }>;
  };
  workStat: {
    label: string;
    href: string;
    note: string;
  };
  network: {
    label: string;
    headline: string;
    body: string;
  };
  clients: {
    label: string;
    logos: HomepageClientLogo[];
  };
  finalCta: {
    headlineBefore: string;
    headlineAccent: string;
    headlineAfter: string;
    text: string;
    cta: { label: string; href: string };
  };
};

/**
 * About page content from the AI Development Kit About module.
 * No invented team profiles or LinkedIn URLs.
 */
export function getAboutPageContent(locale: Locale): AboutPageContent {
  const paths = getServicePaths(locale);
  const work = localizePathname("/work", locale);
  const logos = getClientLogos();

  if (locale === "en") {
    return {
      seo: {
        title: "About Studiojeker | Visual Content & Marketing for Businesses",
        description:
          "Learn how Studiojeker has been helping businesses create visibility through photography, film, 3D visualization and strategic marketing since 1992.",
      },
      hero: {
        label: "About",
        headline: "More than thirty years of creating visibility.",
        subheadline: "Visual Content & Marketing for Businesses.",
        body: [
          "Since 1992 we help companies become visible — not through isolated productions, but through strategic visual communication.",
        ],
        cta: { label: "Get in touch", href: paths.contact },
        media: {
          src: "/images/business/Industrie_5-fb0c83d5.jpg",
          alt: "Production at Studiojeker",
          width: 1600,
          height: 1066,
        },
      },
      story: {
        label: "Our story",
        headline: "From photography to integrated communication.",
        body: [
          "Founded in 1992. From photography to film, 3D visualization, drone and marketing.",
          "Today Studiojeker combines these disciplines into one business solution.",
        ],
      },
      services: {
        label: "What we do",
        headline: "Four focus areas. One partner.",
        text: "Every discipline links directly to its service page.",
        items: [
          { id: "architecture", title: "Architecture", href: paths.architecture },
          {
            id: "product",
            title: "Product Communication",
            href: paths.product,
          },
          {
            id: "business",
            title: "Business Communication",
            href: paths.business,
          },
          {
            id: "digital",
            title: "Digital Marketing",
            href: paths.digital,
          },
        ],
      },
      workStat: {
        label: "Our work",
        href: work,
        note: "Selected projects and references.",
      },
      network: {
        label: "Our network",
        headline: "Specialists for every discipline.",
        body: "Studiojeker collaborates with a trusted network of specialists. Every project is assembled with the right expertise. Team portraits and profiles will follow when approved content is available.",
      },
      clients: {
        label: "Brands that trust us",
        logos,
      },
      finalCta: {
        headlineBefore: "Let's create ",
        headlineAccent: "visibility",
        headlineAfter: " together.",
        text: "We look forward to getting to know your business.",
        cta: { label: "Get in touch", href: paths.contact },
      },
    };
  }

  return {
    seo: {
      title: "Über Studiojeker | Visual Content & Marketing for Businesses",
      description:
        "Seit 1992 schafft Studiojeker Sichtbarkeit für Unternehmen — mit Fotografie, Film, 3D-Visualisierung und strategischem Marketing.",
    },
    hero: {
      label: "Über uns",
      headline: "Mehr als dreissig Jahre Sichtbarkeit schaffen.",
      subheadline: "Visual Content & Marketing for Businesses.",
      body: [
        "Seit 1992 unterstützen wir Unternehmen dabei, sichtbar zu werden. Nicht durch einzelne Produktionen. Sondern durch strategische visuelle Kommunikation.",
      ],
      cta: { label: "Jetzt Kontakt aufnehmen", href: paths.contact },
      media: {
        src: "/images/business/Industrie_5-fb0c83d5.jpg",
        alt: "Produktion bei Studiojeker",
        width: 1600,
        height: 1066,
      },
    },
    story: {
      label: "Unsere Geschichte",
      headline: "Von der Fotografie zur integrierten Kommunikation.",
      body: [
        "Gegründet 1992. Von Fotografie über Film, 3D-Visualisierung und Drohne bis zu Marketing.",
        "Heute verbindet Studiojeker diese Disziplinen zu einer Business-Lösung.",
      ],
    },
    services: {
      label: "Was wir tun",
      headline: "Vier Schwerpunkte. Ein Partner.",
      text: "Jeder Bereich führt direkt zur entsprechenden Service-Seite.",
      items: [
        { id: "architecture", title: "Architecture", href: paths.architecture },
        {
          id: "product",
          title: "Product Communication",
          href: paths.product,
        },
        {
          id: "business",
          title: "Business Communication",
          href: paths.business,
        },
        {
          id: "digital",
          title: "Digital Marketing",
          href: paths.digital,
        },
      ],
    },
    workStat: {
      label: "Unsere Arbeiten",
      href: work,
      note: "Ausgewählte Projekte und Referenzen.",
    },
    network: {
      label: "Unser Netzwerk",
      headline: "Spezialist:innen in allen Disziplinen.",
      body: "Studiojeker arbeitet mit einem Netzwerk spezialisierter Kreativer und Partner. Für jedes Projekt wird das optimale Team zusammengestellt. Team-Porträts und Profile folgen, sobald freigegebene Inhalte vorliegen.",
    },
    clients: {
      label: "Brands, die uns vertrauen",
      logos,
    },
    finalCta: {
      headlineBefore: "Lassen Sie uns gemeinsam ",
      headlineAccent: "Sichtbarkeit",
      headlineAfter: " schaffen.",
      text: "Wir freuen uns darauf, Ihr Unternehmen kennenzulernen.",
      cta: { label: "Jetzt Kontakt aufnehmen", href: paths.contact },
    },
  };
}
