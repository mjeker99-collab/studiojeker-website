import type { Locale } from "@/types/i18n";
import type { HomepageClientLogo, HomepageMedia } from "@/types/homepage";
import { getClientLogos } from "@/lib/content/clients";
import { getAiPath, localizePathname } from "@/lib/i18n/config";

export type AiApplicationItem = {
  id: string;
  number: string;
  title: string;
  description: string;
};

export type AiTextBlock = {
  headline: string;
  body: string[];
  media?: HomepageMedia;
  videoId?: string;
};

export type AiPageContent = {
  seo: {
    title: string;
    description: string;
    ogImagePath?: string;
  };
  hero: {
    label: string;
    headline: string;
    body: string;
    media: HomepageMedia;
    videoId?: string;
  };
  intro: AiTextBlock;
  applications: {
    headline: string;
    items: AiApplicationItem[];
    media?: HomepageMedia;
    videoId?: string;
  };
  models: AiTextBlock;
  experience: AiTextBlock;
  approach: AiTextBlock;
  clients: {
    label: string;
    logos: HomepageClientLogo[];
  };
  closing: {
    headline: string;
    text: string;
    cta: { label: string; href: string };
  };
};

export { getAiPath };

/** Canonical path pair for hreflang / language switcher. */
export const aiLanguageAlternates = {
  de: getAiPath("de"),
  en: getAiPath("en"),
} as const;

const FALLBACK_MEDIA: HomepageMedia = {
  src: "/images/Social marketing/Social marketing/PHOTO-2023-05-11-15-00-27.jpg",
  alt: "Studiojeker visuelle Produktion",
  width: 1200,
  height: 900,
};

/**
 * Local fallback for the KI / AI page.
 * DE path: `/ki` · EN path: `/en/ai`.
 * Marketing copy matches the approved brief; Sanity overrides when published.
 */
export function getAiPageContent(locale: Locale): AiPageContent {
  const contact = localizePathname("/contact", locale);
  const logos = getClientLogos();
  const media: HomepageMedia = {
    ...FALLBACK_MEDIA,
    alt:
      locale === "en"
        ? "Studiojeker visual production"
        : "Studiojeker visuelle Produktion",
  };

  if (locale === "en") {
    return {
      seo: {
        title: "AI for Image, Video & 3D | Studiojeker",
        description:
          "Studiojeker combines artificial intelligence with more than 30 years of experience in photography, film, 3D and visual communication.",
      },
      hero: {
        label: "ARTIFICIAL INTELLIGENCE",
        headline: "AI. Where experience meets new possibilities.",
        body: "Studiojeker uses artificial intelligence wherever it can expand creative possibilities, make production more efficient and open up new ways of creating visual content. We combine state-of-the-art AI technologies with more than 30 years of experience in communication, photography, film and 3D.",
        media,
      },
      intro: {
        headline: "AI is a tool. An incredibly powerful one.",
        body: [
          "Artificial intelligence is fundamentally changing what is possible in visual communication. At Studiojeker, however, it does not replace creative ideas, experience or professional design expertise.",
          "We integrate AI into our established workflows – from the first idea to the finished image, film or 3D animation. What matters is not which technology is used, but what we create with it.",
          "Our ambition remains the same: maximum quality, powerful visual communication and production processes that make economic sense for our clients.",
        ],
      },
      applications: {
        headline: "Where we use AI",
        items: [
          {
            id: "concept",
            number: "01",
            title: "CONCEPT & IDEATION",
            description:
              "AI supports research, idea development, creative variations and the development of communication concepts.",
          },
          {
            id: "storyboarding",
            number: "02",
            title: "STORYBOARDING",
            description:
              "Ideas become visible at an early stage. AI allows us to develop storyboards, visual references, scenes and visual worlds before production begins.",
          },
          {
            id: "planning",
            number: "03",
            title: "PLANNING & PREPRODUCTION",
            description:
              "AI supports production planning, structuring and the preparation of complex photography, film and 3D projects.",
          },
          {
            id: "postproduction",
            number: "04",
            title: "IMAGE & VIDEO POSTPRODUCTION",
            description:
              "Retouching, extensions, adaptations, compositing and other AI-assisted techniques complement our established postproduction workflows.",
          },
          {
            id: "generation",
            number: "05",
            title: "IMAGE & VIDEO GENERATION",
            description:
              "We create high-quality visual content and, where appropriate, combine AI-generated elements with real photography, film or existing assets.",
          },
          {
            id: "visualisation",
            number: "06",
            title: "3D VISUALISATION & ANIMATION",
            description:
              "AI expands our established 3D workflows – from concept and material development to the optimisation and further processing of visualisations and animations.",
          },
        ],
      },
      models: {
        headline: "The best models. The right expertise.",
        body: [
          "Artificial intelligence is evolving at extraordinary speed. That is why we do not commit ourselves to individual platforms or models.",
          "Studiojeker works with the most capable AI models and technologies available for each specific project. The key is choosing the right tool for the task.",
          "Our AI specialists continuously explore new models, workflows and production methods. This allows us to improve our processes and continually push the boundaries of what can be achieved with AI at a professional level.",
        ],
      },
      experience: {
        headline: "AI + Experience",
        body: [
          "A powerful AI model alone does not create powerful communication.",
          "Quality comes from ideas, experience, art direction, precise prompting, selection, control and professional postproduction.",
          "This is where our strength lies: combining new AI technologies with decades of experience in visual communication and professional content production.",
        ],
      },
      approach: {
        headline: "Focused. Responsible. Efficient.",
        body: [
          "We use AI consciously and according to the requirements of each project. Not everything that is technically possible makes sense for every production.",
          "Our goal is therefore not to maximise the use of AI, but to create the best possible production process for each task.",
          "Where AI delivers better results, additional creative possibilities or greater production efficiency, we use it. Where traditional photography, filmmaking, 3D or human creative work is the better solution, we continue to rely on those methods.",
          "The result is the best possible combination of quality, creativity and cost efficiency for our clients.",
        ],
      },
      clients: {
        label: "Selected clients",
        logos,
      },
      closing: {
        headline: "What can we make possible with AI?",
        text: "Tell us about your idea. We will show you which combination of traditional production, 3D and AI makes the most sense.",
        cta: { label: "DISCUSS YOUR PROJECT", href: contact },
      },
    };
  }

  return {
    seo: {
      title: "KI für Bild, Video & 3D | Studiojeker",
      description:
        "Studiojeker verbindet künstliche Intelligenz mit über 30 Jahren Erfahrung in Fotografie, Film, 3D und visueller Kommunikation.",
    },
    hero: {
      label: "KÜNSTLICHE INTELLIGENZ",
      headline: "KI. Wenn Erfahrung auf neue Möglichkeiten trifft.",
      body: "Studiojeker setzt künstliche Intelligenz gezielt dort ein, wo sie kreative Prozesse erweitert, Produktionen effizienter macht und neue visuelle Möglichkeiten eröffnet. Dabei verbinden wir modernste KI-Technologien mit über 30 Jahren Erfahrung in Kommunikation, Fotografie, Film und 3D.",
      media,
    },
    intro: {
      headline: "KI ist für uns ein Werkzeug. Ein verdammt gutes.",
      body: [
        "Künstliche Intelligenz verändert die Möglichkeiten visueller Kommunikation grundlegend. Für Studiojeker ersetzt sie jedoch weder kreative Ideen noch Erfahrung und gestalterisches Know-how.",
        "Wir integrieren KI gezielt in unsere bestehenden Workflows – von der ersten Idee bis zum fertigen Bild, Film oder zur 3D-Animation. Entscheidend ist nicht, welche Technologie eingesetzt wird, sondern was am Ende entsteht.",
        "Unser Anspruch bleibt derselbe: maximale Qualität, starke visuelle Kommunikation und eine Produktion, die für unsere Kunden wirtschaftlich sinnvoll ist.",
      ],
    },
    applications: {
      headline: "Wo wir KI einsetzen",
      items: [
        {
          id: "concept",
          number: "01",
          title: "KONZEPT & IDEENENTWICKLUNG",
          description:
            "KI unterstützt uns bei Recherche, Ideenentwicklung, Varianten und der Ausarbeitung von Kommunikationskonzepten.",
        },
        {
          id: "storyboarding",
          number: "02",
          title: "STORYBOARDING",
          description:
            "Ideen werden früh sichtbar. Mit KI entwickeln wir Storyboards, Visual References, Szenen und Bildwelten bereits vor Produktionsbeginn.",
        },
        {
          id: "planning",
          number: "03",
          title: "PLANUNG & PREPRODUCTION",
          description:
            "KI unterstützt Produktionsplanung, Strukturierung und die Vorbereitung komplexer Foto-, Film- und 3D-Projekte.",
        },
        {
          id: "postproduction",
          number: "04",
          title: "BILD & VIDEO POSTPRODUCTION",
          description:
            "Retusche, Erweiterungen, Anpassungen, Compositing und weitere KI-gestützte Verfahren ergänzen unsere klassischen Postproduction-Workflows.",
        },
        {
          id: "generation",
          number: "05",
          title: "BILD- & VIDEOGENERIERUNG",
          description:
            "Wir generieren hochwertige visuelle Inhalte und kombinieren KI-generierte Elemente bei Bedarf mit realer Fotografie, Film oder bestehenden Assets.",
        },
        {
          id: "visualisation",
          number: "06",
          title: "3D VISUALISIERUNG & ANIMATION",
          description:
            "KI erweitert unsere etablierten 3D-Workflows – von Konzept und Materialentwicklung bis zur Optimierung und Weiterverarbeitung von Visualisierungen und Animationen.",
        },
      ],
    },
    models: {
      headline: "Die besten Modelle. Das richtige Know-how.",
      body: [
        "Die Entwicklung im Bereich künstlicher Intelligenz ist extrem dynamisch. Deshalb legen wir uns nicht auf einzelne Plattformen oder Modelle fest.",
        "Studiojeker arbeitet projektbezogen mit den jeweils leistungsfähigsten verfügbaren KI-Modellen und Technologien. Entscheidend ist, für jede Aufgabe das richtige Werkzeug einzusetzen.",
        "Unsere KI-Spezialisten beschäftigen sich kontinuierlich mit neuen Modellen, Workflows und Produktionsmethoden. So verbessern wir unsere Prozesse laufend und erweitern die Grenzen dessen, was sich mit KI qualitativ sinnvoll realisieren lässt.",
      ],
    },
    experience: {
      headline: "KI + Erfahrung",
      body: [
        "Ein gutes KI-Modell allein produziert noch keine gute Kommunikation.",
        "Qualität entsteht durch Ideen, Erfahrung, Art Direction, präzise Prompts, Auswahl, Kontrolle und professionelle Weiterverarbeitung.",
        "Genau hier liegt unsere Stärke: Wir verbinden neue KI-Technologien mit jahrzehntelanger Erfahrung in visueller Kommunikation und professioneller Content-Produktion.",
      ],
    },
    approach: {
      headline: "Gezielt. Verantwortungsbewusst. Effizient.",
      body: [
        "Wir setzen KI bewusst und projektbezogen ein. Nicht alles, was technisch möglich ist, ist für jedes Projekt sinnvoll.",
        "Unser Ziel ist deshalb nicht maximaler KI-Einsatz, sondern der optimale Produktionsprozess für die jeweilige Aufgabe.",
        "Wo KI bessere Resultate, zusätzliche kreative Möglichkeiten oder eine effizientere Produktion ermöglicht, nutzen wir sie. Wo klassische Fotografie, Filmproduktion, 3D oder menschliche Kreativarbeit die bessere Lösung ist, setzen wir weiterhin darauf.",
        "So entsteht für unsere Kunden die bestmögliche Kombination aus Qualität, Kreativität und Kosteneffizienz.",
      ],
    },
    clients: {
      label: "Ausgewählte Kunden",
      logos,
    },
    closing: {
      headline: "Was können wir mit KI für Sie möglich machen?",
      text: "Erzählen Sie uns von Ihrer Idee. Wir zeigen Ihnen, welche Kombination aus klassischer Produktion, 3D und KI dafür am meisten Sinn macht.",
      cta: { label: "PROJEKT BESPRECHEN", href: contact },
    },
  };
}
