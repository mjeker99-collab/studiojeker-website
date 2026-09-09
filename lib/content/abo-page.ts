import type { Locale } from "@/types/i18n";
import type { HomepageBenefit, HomepageMedia } from "@/types/homepage";
import { getAboPath, localizePathname } from "@/lib/i18n/config";
import { showreels } from "@/lib/content/showreels";

export type AboPageContent = {
  seo: {
    title: string;
    description: string;
    ogImagePath?: string;
  };
  hero: {
    label: string;
    headline: string;
    body: string;
    primaryCta: { label: string; href: string };
    media: HomepageMedia;
  };
  problem: {
    label: string;
    headline: string;
    body: string[];
    highlight: string;
  };
  benefits: {
    items: HomepageBenefit[];
  };
  process: {
    headline: string;
    steps: Array<{ id: string; number: string; title: string; description: string }>;
  };
  scope: {
    headline: string;
    introduction: string;
    items: string[];
    closing: string;
    highlight: string;
  };
  showreel: {
    label: string;
    headline: string;
    body: string;
    cta: { label: string; href: string };
    media: HomepageMedia;
    /** Vimeo id when Sanity media type is video; empty when image-only. */
    videoId?: string;
  };
  closing: {
    label: string;
    headline: string;
    text: string;
    cta: { label: string; href: string };
  };
};

/**
 * Local fallback for the Content-Abo landing page.
 * DE path: `/content-abo` (no `/de` prefix — project language logic).
 * EN path: `/en/content-subscription`.
 * No package prices in V1.
 */
export function getAboPageContent(locale: Locale): AboPageContent {
  const contact = localizePathname("/contact", locale);

  const media: HomepageMedia = {
    src: "/images/Social marketing/Social marketing/PHOTO-2023-05-11-15-00-27.jpg",
    alt:
      locale === "en"
        ? "Studiojeker content production"
        : "Studiojeker Content-Produktion",
    width: 1200,
    height: 900,
  };

  if (locale === "en") {
    return {
      seo: {
        title: "Visibility Subscription | Studiojeker",
        description:
          "Continuous content for website, social media and digital communication — planned, produced and delivered by Studiojeker.",
      },
      hero: {
        label: "Visibility subscription",
        headline: "Regularly visible. Without constantly thinking about it.",
        body: "We continuously produce the content your business needs — for website, social media and digital communication. Predictable, professional and from one partner.",
        primaryCta: { label: "Request content subscription", href: contact },
        media,
      },
      problem: {
        label: "Good content needs continuity",
        headline: "Visibility is not created once. It is created again and again.",
        body: [
          "Many businesses know they should communicate regularly. In day-to-day work, time, resources or the right content are missing.",
          "With the Studiojeker content subscription this becomes a predictable process: we develop, produce and deliver new content continuously.",
        ],
        highlight: "No one-off actions. No constant re-briefing. A system.",
      },
      benefits: {
        items: [
          {
            id: "continuous",
            title: "Continuous content",
            description:
              "Regular new photos, videos, reels, graphics and further assets.",
          },
          {
            id: "system",
            title: "One system",
            description: "Planning, production and delivery work together.",
          },
          {
            id: "visibility",
            title: "More visibility",
            description:
              "Continuous presence on the relevant digital channels.",
          },
          {
            id: "planning",
            title: "Predictable costs",
            description:
              "A defined monthly budget instead of constant one-off quotes.",
          },
        ],
      },
      process: {
        headline: "From planning to finished content.",
        steps: [
          {
            id: "plan",
            number: "01",
            title: "Plan",
            description:
              "Together we define topics, goals, channels and the content you need.",
          },
          {
            id: "produce",
            number: "02",
            title: "Produce",
            description:
              "Photo, video, reels, animation, graphics and copy are created at Studiojeker from one partner.",
          },
          {
            id: "publish",
            number: "03",
            title: "Publish",
            description:
              "Content is prepared for website, LinkedIn, Instagram, Facebook and further channels.",
          },
          {
            id: "develop",
            number: "04",
            title: "Develop further",
            description:
              "We analyse, plan ahead and keep communication from going quiet again.",
          },
        ],
      },
      scope: {
        headline: "As individual as your business.",
        introduction: "Depending on need, we combine:",
        items: [
          "Photography",
          "Video",
          "Reels",
          "Interviews",
          "Business portraits",
          "Product content",
          "Animation & motion graphics",
          "Graphics",
          "Copy",
          "Social media content",
          "Editorial planning",
          "Publishing",
        ],
        closing:
          "The subscription is assembled according to communication need, frequency and production scope.",
        highlight: "A fixed monthly budget. A clearly defined scope of work.",
      },
      showreel: {
        label: "Showreel",
        headline: "One partner. All disciplines",
        body: "Strategy, creation and production under one roof. That reduces handovers and keeps the brand appearance consistent.",
        cta: { label: "Request content subscription", href: contact },
        media,
        videoId: showreels.homepage,
      },
      closing: {
        label: "Ready for more visibility?",
        headline: "Let's make content predictable.",
        text: "We are happy to show you what a content subscription could look like for your business.",
        cta: { label: "Non-binding conversation", href: contact },
      },
    };
  }

  return {
    seo: {
      title: "Sichtbarkeit im Abo | Studiojeker",
      description:
        "Kontinuierlicher Content für Website, Social Media und digitale Kommunikation — planbar produziert von Studiojeker.",
    },
    hero: {
      label: "Sichtbarkeit im Abo",
      headline: "Regelmässig sichtbar. Ohne ständig daran denken zu müssen.",
      body: "Wir produzieren laufend die Inhalte, die Ihr Unternehmen braucht – für Website, Social Media und digitale Kommunikation. Planbar, professionell und aus einer Hand.",
      primaryCta: { label: "Content-Abo anfragen", href: contact },
      media,
    },
    problem: {
      label: "Guter Content braucht Kontinuität",
      headline: "Sichtbarkeit entsteht nicht einmal. Sondern immer wieder.",
      body: [
        "Viele Unternehmen wissen, dass sie regelmässig kommunizieren sollten. Im Alltag fehlen aber Zeit, Ressourcen oder die passenden Inhalte.",
        "Mit dem Studiojeker Content-Abo wird daraus ein planbarer Prozess: Wir entwickeln, produzieren und liefern kontinuierlich neuen Content.",
      ],
      highlight: "Keine Einzelaktionen. Kein ständiges Neu-Briefing. Sondern ein System.",
    },
    benefits: {
      items: [
        {
          id: "continuous",
          title: "Kontinuierlicher Content",
          description:
            "Regelmässig neue Fotos, Videos, Reels, Grafiken und weitere Inhalte.",
        },
        {
          id: "system",
          title: "Ein System",
          description: "Planung, Produktion und Umsetzung greifen ineinander.",
        },
        {
          id: "visibility",
          title: "Mehr Sichtbarkeit",
          description:
            "Kontinuierliche Präsenz auf den relevanten digitalen Kanälen.",
        },
        {
          id: "planning",
          title: "Planbare Kosten",
          description:
            "Ein definiertes monatliches Budget statt ständig neuer Einzelofferten.",
        },
      ],
    },
    process: {
      headline: "Von der Planung bis zum fertigen Content.",
      steps: [
        {
          id: "plan",
          number: "01",
          title: "Planen",
          description:
            "Gemeinsam definieren wir Themen, Ziele, Kanäle und den benötigten Content.",
        },
        {
          id: "produce",
          number: "02",
          title: "Produzieren",
          description:
            "Foto, Video, Reels, Animation, Grafik und Text entstehen bei Studiojeker aus einer Hand.",
        },
        {
          id: "publish",
          number: "03",
          title: "Ausspielen",
          description:
            "Die Inhalte werden für Website, LinkedIn, Instagram, Facebook und weitere Kanäle aufbereitet.",
        },
        {
          id: "develop",
          number: "04",
          title: "Weiterentwickeln",
          description:
            "Wir analysieren, planen weiter und sorgen dafür, dass die Kommunikation nicht wieder einschläft.",
        },
      ],
    },
    scope: {
      headline: "So individuell wie Ihr Unternehmen.",
      introduction: "Je nach Bedarf kombinieren wir:",
      items: [
        "Fotografie",
        "Video",
        "Reels",
        "Interviews",
        "Businessportraits",
        "Produktcontent",
        "Animation & Motion Graphics",
        "Grafik",
        "Text",
        "Social-Media-Content",
        "Redaktionsplanung",
        "Publishing",
      ],
      closing:
        "Das Abo wird entsprechend Kommunikationsbedarf, Frequenz und Produktionsumfang zusammengestellt.",
      highlight: "Ein fixes monatliches Budget. Ein klar definierter Leistungsumfang.",
    },
    showreel: {
      label: "Showreel",
      headline: "Ein Partner. Alle Disziplinen",
      body: "Strategie, Kreation und Produktion unter einem Dach. Das reduziert Schnittstellen und sorgt für einen konsistenten Auftritt.",
      cta: { label: "Content-Abo anfragen", href: contact },
      media,
      videoId: showreels.homepage,
    },
    closing: {
      label: "Bereit für mehr Sichtbarkeit?",
      headline: "Machen wir Content planbar.",
      text: "Wir zeigen Ihnen gerne, wie ein Content-Abo für Ihr Unternehmen aussehen könnte.",
      cta: { label: "Unverbindliches Gespräch", href: contact },
    },
  };
}

/** Canonical path pair for hreflang / language switcher. */
export const aboLanguageAlternates = {
  de: getAboPath("de"),
  en: getAboPath("en"),
} as const;
