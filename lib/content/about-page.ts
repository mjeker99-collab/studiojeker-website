import type { Locale } from "@/types/i18n";
import { localizePathname } from "@/lib/i18n/config";
import { getServicePaths } from "@/lib/content/services/paths";
import { getClientLogos } from "@/lib/content/clients";
import type { HomepageClientLogo, HomepageContent } from "@/types/homepage";

export type AboutTeamMember = {
  id: string;
  name: string;
  role: string;
  image: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
};

export type AboutPageContent = {
  seo: { title: string; description: string };
  hero: {
    label: string;
    headline: string;
    headlineAccent: string;
    subheadline: string;
    body: string[];
    primaryCta: { label: string; href: string };
    media: { src: string; alt: string; width: number; height: number };
  };
  values: {
    label: string;
    items: Array<{ id: string; title: string; description: string }>;
  };
  services: HomepageContent["services"];
  team: {
    label: string;
    headline: string;
    introduction: string;
    members: AboutTeamMember[];
    network: {
      title: string;
      body: string;
    };
  };
  facts: {
    items: Array<{
      id: string;
      value: string;
      label: string;
      href?: string;
    }>;
  };
  approach: HomepageContent["about"];
  clients: {
    label: string;
    logos: HomepageClientLogo[];
  };
  finalCta: HomepageContent["finalCta"];
};

/**
 * About page content.
 * Team members limited to people with both a local portrait asset and a
 * verified name/role from the live studiojeker.ch/team page.
 * No invented statistics, biographies or LinkedIn URLs.
 */
export function getAboutPageContent(locale: Locale): AboutPageContent {
  const paths = getServicePaths(locale);
  const work = localizePathname("/work", locale);
  const contact = paths.contact;
  const logos = getClientLogos();

  const serviceItems = [
    {
      id: "architecture" as const,
      title: "Architecture",
      href: paths.architecture,
    },
    {
      id: "product" as const,
      title: "Product Communication",
      href: paths.product,
    },
    {
      id: "business" as const,
      title: "Business Communication",
      href: paths.business,
    },
    {
      id: "digital" as const,
      title: "Digital Marketing",
      href: paths.digital,
    },
  ];

  if (locale === "en") {
    return {
      seo: {
        title: "About Studiojeker | Your Visibility Partner Since 1992",
        description:
          "Meet Studiojeker, a Swiss Visibility Partner combining strategy, premium content and marketing since 1992.",
      },
      hero: {
        label: "About Studiojeker",
        headline: "We create\nvisibility",
        headlineAccent: ".",
        subheadline: "Your Visibility Partner for businesses, products and architecture.",
        body: [
          "Visibility doesn’t happen by chance. It is created when strategy, premium content and meaningful communication come together.",
          "Since 1992, we have helped businesses strengthen their brands through photography, film, 3D visualisation, design and digital marketing.",
        ],
        primaryCta: { label: "Explore our work", href: work },
        media: {
          src: "/images/Social marketing/Social marketing/Filmproduktionimg1.jpg",
          alt: "Film production at Studiojeker",
          width: 1600,
          height: 1066,
        },
      },
      values: {
        label: "Our approach",
        items: [
          {
            id: "personal",
            title: "Personal",
            description:
              "A small, dedicated team. Flexible, direct and committed to making every project count.",
          },
          {
            id: "creative",
            title: "Creative",
            description:
              "Strategy, premium content and modern production working together as one solution.",
          },
          {
            id: "reliable",
            title: "Reliable",
            description:
              "Decades of experience, Swiss precision and a trusted network of specialists.",
          },
        ],
      },
      services: {
        label: "How we create visibility",
        headline: "Four focus areas. One partner.",
        items: [
          {
            ...serviceItems[0],
            description:
              "Photorealistic visualisation, animation and immersive experiences for architecture and real estate.",
          },
          {
            ...serviceItems[1],
            description:
              "Photography, film and 3D that explain products and support sales.",
          },
          {
            ...serviceItems[2],
            description:
              "Authentic communication for companies, organisations and brands.",
          },
          {
            ...serviceItems[3],
            description:
              "Content and campaigns that build presence with clarity and continuity.",
          },
        ],
      },
      team: {
        label: "Our team",
        headline: "People behind the work.",
        introduction:
          "Studiojeker works with a focused team and a trusted network of specialists. Every project is assembled with the right expertise.",
        members: [
          {
            id: "martin",
            name: "Martin Jeker",
            role: "Management / Photography",
            image: {
              src: "/images/team/Martin.jpg",
              alt: "Martin Jeker",
              width: 1920,
              height: 1079,
            },
          },
          {
            id: "nora",
            name: "Nora Jeker",
            role: "Management / Digital Marketing / Project Management",
            image: {
              src: "/images/team/Nora.jpg",
              alt: "Nora Jeker",
              width: 1920,
              height: 1080,
            },
          },
        ],
        network: {
          title: "Partner network",
          body: "Specialists across photography, film, 3D and marketing — assembled per project.",
        },
      },
      facts: {
        items: [
          {
            id: "since",
            value: "Since 1992",
            label: "Experience in visual communication",
          },
          {
            id: "years",
            value: "30+",
            label: "Years of creating visibility",
          },
          {
            id: "focus",
            value: "1 partner",
            label: "Photography, film, 3D, design and marketing",
          },
          {
            id: "work",
            value: "Our work",
            label: "Selected projects and references",
            href: work,
          },
        ],
      },
      approach: {
        label: "How we work",
        headline: "Strategy. Creativity. Production. Impact",
        headlineAccent: ".",
        subheadline: "Personal. Creative. Reliable.",
        body: [
          "Studiojeker combines decades of experience with modern technology and a trusted network of specialists.",
          "From the first idea to the final result — one partner, one workflow, one clear goal: visibility that works.",
        ],
        cta: { label: "Get in touch", href: contact },
        media: {
          src: "/images/Social marketing/Social marketing/PHOTO-2023-05-11-15-00-27.jpg",
          alt: "Content production at Studiojeker",
          width: 1200,
          height: 900,
        },
      },
      clients: {
        label: "Brands that trust us",
        logos,
      },
      finalCta: {
        headlineBefore: "Let's create ",
        headlineAccent: "visibility",
        headlineAfter: " together.",
        text: "We look forward to your project.",
        cta: { label: "Get in touch", href: contact },
      },
    };
  }

  return {
    seo: {
      title: "Über Studiojeker | Visibility Partner seit 1992",
      description:
        "Studiojeker ist Visibility Partner für Unternehmen — mit Fotografie, Film, 3D, Design und Digital Marketing seit 1992.",
    },
    hero: {
      label: "Über Studiojeker",
      headline: "We create\nvisibility",
      headlineAccent: ".",
      subheadline:
        "Ihr Visibility Partner für Unternehmen, Produkte und Architektur.",
      body: [
        "Sichtbarkeit entsteht nicht durch Zufall. Sie entsteht, wenn Strategie, hochwertiger Content und die richtige Kommunikation zusammenkommen.",
        "Seit 1992 begleiten wir Unternehmen mit Fotografie, Film, 3D-Visualisierung, Design und Digital Marketing.",
      ],
      primaryCta: { label: "Unsere Arbeiten entdecken", href: work },
      media: {
        src: "/images/Social marketing/Social marketing/Filmproduktionimg1.jpg",
        alt: "Filmproduktion bei Studiojeker",
        width: 1600,
        height: 1066,
      },
    },
    values: {
      label: "Unser Anspruch",
      items: [
        {
          id: "personal",
          title: "Persönlich",
          description:
            "Ein kleines, engagiertes Team. Flexibel, direkt und mit dem Anspruch, jedes Projekt zu etwas Besonderem zu machen.",
        },
        {
          id: "creative",
          title: "Kreativ",
          description:
            "Strategie, hochwertiger Content und moderne Produktion greifen ineinander — als eine Lösung.",
        },
        {
          id: "reliable",
          title: "Zuverlässig",
          description:
            "Langjährige Erfahrung, Schweizer Präzision und ein starkes Partnernetzwerk.",
        },
      ],
    },
    services: {
      label: "Wobei wir unterstützen",
      headline: "Vier Schwerpunkte. Ein Partner.",
      items: [
        {
          ...serviceItems[0],
          description:
            "Fotorealistische Visualisierungen, Animationen und immersive Erlebnisse für Architektur und Immobilien.",
        },
        {
          ...serviceItems[1],
          description:
            "Fotografie, Film und 3D, die Produkte erklären und den Vertrieb unterstützen.",
        },
        {
          ...serviceItems[2],
          description:
            "Authentische Kommunikation für Unternehmen, Organisationen und Marken.",
        },
        {
          ...serviceItems[3],
          description:
            "Content und Kampagnen, die Präsenz mit Klarheit und Kontinuität aufbauen.",
        },
      ],
    },
    team: {
      label: "Unser Team",
      headline: "Die Menschen hinter der Arbeit.",
      introduction:
        "Studiojeker arbeitet mit einem fokussierten Team und einem Netzwerk spezialisierter Partner. Für jedes Projekt wird die passende Expertise zusammengestellt.",
      members: [
        {
          id: "martin",
          name: "Martin Jeker",
          role: "Geschäftsleitung / Fotograf",
          image: {
            src: "/images/team/Martin.jpg",
            alt: "Martin Jeker",
            width: 1920,
            height: 1079,
          },
        },
        {
          id: "nora",
          name: "Nora Jeker",
          role: "Geschäftsleitung / Digital Marketing / Projektleitungen",
          image: {
            src: "/images/team/Nora.jpg",
            alt: "Nora Jeker",
            width: 1920,
            height: 1080,
          },
        },
      ],
      network: {
        title: "Partner Netzwerk",
        body: "Spezialist:innen in Fotografie, Film, 3D und Marketing — projektspezifisch eingesetzt.",
      },
    },
    facts: {
      items: [
        {
          id: "since",
          value: "Seit 1992",
          label: "Erfahrung in visueller Kommunikation",
        },
        {
          id: "years",
          value: "30+",
          label: "Jahre Sichtbarkeit schaffen",
        },
        {
          id: "focus",
          value: "1 Partner",
          label: "Fotografie, Film, 3D, Design und Marketing",
        },
        {
          id: "work",
          value: "Unsere Arbeiten",
          label: "Ausgewählte Projekte und Referenzen",
          href: work,
        },
      ],
    },
    approach: {
      label: "Unsere Arbeitsweise",
      headline: "Strategie. Kreativität. Produktion. Wirkung",
      headlineAccent: ".",
      subheadline: "Persönlich. Kreativ. Zuverlässig.",
      body: [
        "Studiojeker verbindet langjährige Erfahrung mit modernster Technologie und einem starken Partnernetzwerk.",
        "Von der ersten Idee bis zur erfolgreichen Umsetzung — ein Ansprechpartner, ein Workflow, ein Ziel: Sichtbarkeit mit Wirkung.",
      ],
      cta: { label: "Jetzt Kontakt aufnehmen", href: contact },
      media: {
        src: "/images/Social marketing/Social marketing/PHOTO-2023-05-11-15-00-27.jpg",
        alt: "Content-Produktion bei Studiojeker",
        width: 1200,
        height: 900,
      },
    },
    clients: {
      label: "Brands, die uns vertrauen",
      logos,
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
