import type { Locale } from "@/types/i18n";
import type { HomepageClientLogo, HomepageMedia } from "@/types/homepage";
import { getClientLogos } from "@/lib/content/clients";
import { showreels } from "@/lib/content/showreels";
import { getAiPath, localizePathname } from "@/lib/i18n/config";

export type AiApplicationItem = {
  id: string;
  number: string;
  title: string;
  description: string;
};

export type AiProcessStep = {
  id: string;
  title: string;
  description: string;
};

export type AiTextBlock = {
  headline: string;
  body: string[];
  media?: HomepageMedia;
  videoId?: string;
  /** Optional editor caption under the section media. */
  caption?: string;
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
  process: {
    label: string;
    headline: string;
    introduction: string;
    steps: AiProcessStep[];
  };
  showreel: {
    label: string;
    headline: string;
    body: string;
    cta: { label: string; href: string };
    media: HomepageMedia;
    videoId?: string;
  };
  applications: {
    headline: string;
    items: AiApplicationItem[];
    media?: HomepageMedia;
    videoId?: string;
    caption?: string;
  };
  models: AiTextBlock;
  experience: AiTextBlock;
  approach: AiTextBlock;
  /**
   * Optional stills from the KI showreel (Sanity uploads).
   * Omitted/empty until published — page never invents placeholder art.
   */
  visuals: {
    keyVisual?: HomepageMedia;
    clayVilla?: HomepageMedia;
    photoVilla?: HomepageMedia;
    contentFormats?: HomepageMedia;
    distributionChannels?: HomepageMedia;
  };
  /**
   * Optional 16:9 landscape breaks between process steps / text blocks.
   * Empty slots collapse — no grey placeholders. Images come from Sanity only.
   */
  landscapeBreaks: {
    afterAi?: HomepageMedia;
    afterDistribution?: HomepageMedia;
    afterVisibility?: HomepageMedia;
    /** After applications 01–03, before 04–06. */
    midApplications?: HomepageMedia;
    afterApplications?: HomepageMedia;
    afterModels?: HomepageMedia;
    afterExperience?: HomepageMedia;
  };
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
 * Positioning: strategy + production + AI + distribution → visibility.
 * Sanity overrides when published. Showreel: Vimeo 1228871502.
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
  const showreelMedia: HomepageMedia = {
    ...media,
    alt:
      locale === "en"
        ? "Studiojeker AI and visibility showreel"
        : "Studiojeker KI- und Visibility-Showreel",
  };

  if (locale === "en") {
    return {
      seo: {
        title: "AI for Image, Video & 3D | Studiojeker",
        description:
          "Studiojeker combines strategy, creative concept, classical content production and AI into one continuous process – from idea to distribution and visibility.",
      },
      hero: {
        label: "ARTIFICIAL INTELLIGENCE",
        headline: "AI. Where experience\nmeets new possibilities.",
        body: "Studiojeker integrates artificial intelligence into an established production process: strategy, creative concept, photography, film, 3D – and targeted distribution across digital channels. AI accelerates where it adds value. Studiojeker delivers concept, craft, quality and visibility.",
        media,
      },
      intro: {
        headline: "AI is a tool. An incredibly powerful one.",
        body: [
          "Artificial intelligence expands what is possible in visual communication. At Studiojeker it does not replace ideas, experience or professional design expertise – and it does not turn us into a pure AI agency.",
          "We combine strategy, creative concept, classical content production and AI into one continuous workflow – from the first idea through production to distribution on social media and other digital channels.",
          "What matters is not which technology is used, but what we create with it: maximum quality, strong visual communication and production that makes economic sense for our clients.",
        ],
      },
      process: {
        label: "Process",
        headline: "From concept to visibility.",
        introduction:
          "One continuous path: concept, production, AI where it helps, distribution across channels – and lasting visibility.",
        steps: [
          {
            id: "concept",
            title: "CONCEPT",
            description:
              "Strategy and creative direction. Ideas, messaging and visual concepts before production begins.",
          },
          {
            id: "production",
            title: "PRODUCTION",
            description:
              "Photography, film, 3D and established craft – the foundation of professional content.",
          },
          {
            id: "ai",
            title: "AI",
            description:
              "Artificial intelligence as a tool and accelerator – integrated where quality, options or efficiency improve.",
          },
          {
            id: "distribution",
            title: "DISTRIBUTION",
            description:
              "Content reaches the right channels – especially social media and digital platforms.",
          },
          {
            id: "visibility",
            title: "VISIBILITY",
            description:
              "Consistent presence. Content that works – not as a one-off, but as an ongoing process.",
          },
        ],
      },
      showreel: {
        label: "Showreel",
        headline: "AI in the Studiojeker process",
        body: "How concept, production, AI and distribution come together – for content that creates visibility.",
        cta: { label: "DISCUSS YOUR PROJECT", href: contact },
        media: showreelMedia,
        videoId: showreels.ai,
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
          "Our specialists continuously explore new models, workflows and production methods – always in service of concept, craft and distribution.",
        ],
      },
      experience: {
        headline: "AI + Experience",
        body: [
          "A powerful AI model alone does not create powerful communication.",
          "Quality comes from ideas, experience, art direction, precise prompting, selection, control and professional postproduction.",
          "This is where our strength lies: combining new AI technologies with decades of experience in visual communication, content production and channel-ready delivery.",
        ],
      },
      approach: {
        headline: "Focused. Responsible. Efficient.",
        body: [
          "We use AI consciously and according to the requirements of each project. Not everything that is technically possible makes sense for every production.",
          "Our goal is therefore not to maximise the use of AI, but to create the best possible production process for each task – including distribution.",
          "Where AI delivers better results, additional creative possibilities or greater production efficiency, we use it. Where traditional photography, filmmaking, 3D or human creative work is the better solution, we continue to rely on those methods.",
          "The result is the best possible combination of quality, creativity and cost efficiency for our clients.",
        ],
      },
      visuals: {},
      landscapeBreaks: {},
      clients: {
        label: "Selected clients",
        logos,
      },
      closing: {
        headline: "What can we make possible with AI?",
        text: "Tell us about your idea. We will show you which combination of strategy, classical production, 3D, AI and distribution makes the most sense.",
        cta: { label: "DISCUSS YOUR PROJECT", href: contact },
      },
    };
  }

  return {
    seo: {
      title: "KI für Bild, Video & 3D | Studiojeker",
      description:
        "Studiojeker verbindet Strategie, kreative Konzeption, klassische Content-Produktion und KI zu einem durchgängigen Prozess – von der Idee bis zur Distribution und Sichtbarkeit.",
    },
    hero: {
      label: "KÜNSTLICHE INTELLIGENZ",
      headline: "KI. Wenn Erfahrung\nauf neue Möglichkeiten trifft.",
      body: "Studiojeker integriert künstliche Intelligenz in einen etablierten Produktionsprozess: Strategie, kreative Konzeption, Fotografie, Film, 3D – und gezielte Distribution über digitale Kanäle. KI beschleunigt dort, wo sie Mehrwert schafft. Studiojeker liefert Konzept, Handwerk, Qualität und Sichtbarkeit.",
      media,
    },
    intro: {
      headline: "KI ist für uns ein Werkzeug. Ein verdammt gutes.",
      body: [
        "Künstliche Intelligenz erweitert die Möglichkeiten visueller Kommunikation. Für Studiojeker ersetzt sie weder Ideen, Erfahrung noch gestalterisches Know-how – und wir positionieren uns nicht als reine AI-Agentur.",
        "Wir verbinden Strategie, kreative Konzeption, klassische Content-Produktion und KI zu einem durchgängigen Workflow – von der ersten Idee über die Produktion bis zur Distribution in Social Media und weiteren digitalen Kanälen.",
        "Entscheidend ist nicht, welche Technologie eingesetzt wird, sondern was am Ende entsteht: maximale Qualität, starke visuelle Kommunikation und eine Produktion, die für unsere Kunden wirtschaftlich sinnvoll ist.",
      ],
    },
    process: {
      label: "Prozess",
      headline: "Vom Konzept zur Sichtbarkeit.",
      introduction:
        "Ein durchgängiger Ablauf: Konzept, Produktion, KI wo sie hilft, Distribution über die Kanäle – und nachhaltige Sichtbarkeit.",
      steps: [
        {
          id: "concept",
          title: "CONCEPT",
          description:
            "Strategie und kreative Richtung. Ideen, Botschaften und visuelle Konzepte vor dem Produktionsstart.",
        },
        {
          id: "production",
          title: "PRODUCTION",
          description:
            "Fotografie, Film, 3D und etabliertes Handwerk – die Basis professioneller Inhalte.",
        },
        {
          id: "ai",
          title: "AI",
          description:
            "Künstliche Intelligenz als Werkzeug und Beschleuniger – gezielt dort, wo Qualität, Möglichkeiten oder Effizienz steigen.",
        },
        {
          id: "distribution",
          title: "DISTRIBUTION",
          description:
            "Content erreicht die richtigen Kanäle – insbesondere Social Media und digitale Plattformen.",
        },
        {
          id: "visibility",
          title: "VISIBILITY",
          description:
            "Kontinuierliche Präsenz. Inhalte, die wirken – nicht einmalig, sondern als Prozess.",
        },
      ],
    },
    showreel: {
      label: "Showreel",
      headline: "KI im Studiojeker-Prozess",
      body: "Wie Konzept, Produktion, KI und Distribution zusammenspielen – für Content, der Sichtbarkeit schafft.",
      cta: { label: "PROJEKT BESPRECHEN", href: contact },
      media: showreelMedia,
      videoId: showreels.ai,
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
        "Unsere Spezialisten beschäftigen sich kontinuierlich mit neuen Modellen, Workflows und Produktionsmethoden – immer im Dienst von Konzept, Handwerk und Distribution.",
      ],
    },
    experience: {
      headline: "KI + Erfahrung",
      body: [
        "Ein gutes KI-Modell allein produziert noch keine gute Kommunikation.",
        "Qualität entsteht durch Ideen, Erfahrung, Art Direction, präzise Prompts, Auswahl, Kontrolle und professionelle Weiterverarbeitung.",
        "Genau hier liegt unsere Stärke: Wir verbinden neue KI-Technologien mit jahrzehntelanger Erfahrung in visueller Kommunikation, Content-Produktion und kanalgerechter Ausspielung.",
      ],
    },
    approach: {
      headline: "Gezielt. Verantwortungsbewusst. Effizient.",
      body: [
        "Wir setzen KI bewusst und projektbezogen ein. Nicht alles, was technisch möglich ist, ist für jedes Projekt sinnvoll.",
        "Unser Ziel ist deshalb nicht maximaler KI-Einsatz, sondern der optimale Produktionsprozess für die jeweilige Aufgabe – inklusive Distribution.",
        "Wo KI bessere Resultate, zusätzliche kreative Möglichkeiten oder eine effizientere Produktion ermöglicht, nutzen wir sie. Wo klassische Fotografie, Filmproduktion, 3D oder menschliche Kreativarbeit die bessere Lösung ist, setzen wir weiterhin darauf.",
        "So entsteht für unsere Kunden die bestmögliche Kombination aus Qualität, Kreativität und Kosteneffizienz.",
      ],
    },
    visuals: {},
    landscapeBreaks: {},
    clients: {
      label: "Ausgewählte Kunden",
      logos,
    },
    closing: {
      headline: "Was können wir mit KI für Sie möglich machen?",
      text: "Erzählen Sie uns von Ihrer Idee. Wir zeigen Ihnen, welche Kombination aus Strategie, klassischer Produktion, 3D, KI und Distribution dafür am meisten Sinn macht.",
      cta: { label: "PROJEKT BESPRECHEN", href: contact },
    },
  };
}
