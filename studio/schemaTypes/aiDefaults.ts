/**
 * Default KI / AI singleton values — approved DE/EN copy for Studio `initialValue`
 * and one-time text migration (`scripts/migrate-ai-page-texts.ts`).
 *
 * Images / landscapeBreaks stay empty: editors upload in Studio.
 * Showreel Vimeo URL is prefilled; existing CMS media is never overwritten by migration.
 */

function locString(de: string, en: string) {
  return { _type: "localizedString" as const, de, en };
}

function locText(de: string, en: string) {
  return { _type: "localizedText" as const, de, en };
}

function joinParagraphs(paragraphs: string[]): string {
  return paragraphs.join("\n\n");
}

const processSteps = [
  {
    _type: "aiProcessStep" as const,
    _key: "ai-step-concept",
    id: "concept",
    title: locString("CONCEPT", "CONCEPT"),
    description: locText(
      "Strategie und kreative Richtung. Ideen, Botschaften und visuelle Konzepte vor dem Produktionsstart.",
      "Strategy and creative direction. Ideas, messaging and visual concepts before production begins.",
    ),
  },
  {
    _type: "aiProcessStep" as const,
    _key: "ai-step-production",
    id: "production",
    title: locString("PRODUCTION", "PRODUCTION"),
    description: locText(
      "Fotografie, Film, 3D und etabliertes Handwerk – die Basis professioneller Inhalte.",
      "Photography, film, 3D and established craft – the foundation of professional content.",
    ),
  },
  {
    _type: "aiProcessStep" as const,
    _key: "ai-step-ai",
    id: "ai",
    title: locString("AI", "AI"),
    description: locText(
      "Künstliche Intelligenz als Werkzeug und Beschleuniger – gezielt dort, wo Qualität, Möglichkeiten oder Effizienz steigen.",
      "Artificial intelligence as a tool and accelerator – integrated where quality, options or efficiency improve.",
    ),
  },
  {
    _type: "aiProcessStep" as const,
    _key: "ai-step-distribution",
    id: "distribution",
    title: locString("DISTRIBUTION", "DISTRIBUTION"),
    description: locText(
      "Content erreicht die richtigen Kanäle – insbesondere Social Media und digitale Plattformen.",
      "Content reaches the right channels – especially social media and digital platforms.",
    ),
  },
  {
    _type: "aiProcessStep" as const,
    _key: "ai-step-visibility",
    id: "visibility",
    title: locString("VISIBILITY", "VISIBILITY"),
    description: locText(
      "Kontinuierliche Präsenz. Inhalte, die wirken – nicht einmalig, sondern als Prozess.",
      "Consistent presence. Content that works – not as a one-off, but as an ongoing process.",
    ),
  },
];

const applications = [
  {
    _type: "aiApplicationItem" as const,
    _key: "ai-app-concept",
    id: "concept",
    number: "01",
    title: locString("KONZEPT & IDEENENTWICKLUNG", "CONCEPT & IDEATION"),
    description: locText(
      "KI unterstützt uns bei Recherche, Ideenentwicklung, Varianten und der Ausarbeitung von Kommunikationskonzepten.",
      "AI supports research, idea development, creative variations and the development of communication concepts.",
    ),
  },
  {
    _type: "aiApplicationItem" as const,
    _key: "ai-app-storyboarding",
    id: "storyboarding",
    number: "02",
    title: locString("STORYBOARDING", "STORYBOARDING"),
    description: locText(
      "Ideen werden früh sichtbar. Mit KI entwickeln wir Storyboards, Visual References, Szenen und Bildwelten bereits vor Produktionsbeginn.",
      "Ideas become visible at an early stage. AI allows us to develop storyboards, visual references, scenes and visual worlds before production begins.",
    ),
  },
  {
    _type: "aiApplicationItem" as const,
    _key: "ai-app-planning",
    id: "planning",
    number: "03",
    title: locString("PLANUNG & PREPRODUCTION", "PLANNING & PREPRODUCTION"),
    description: locText(
      "KI unterstützt Produktionsplanung, Strukturierung und die Vorbereitung komplexer Foto-, Film- und 3D-Projekte.",
      "AI supports production planning, structuring and the preparation of complex photography, film and 3D projects.",
    ),
  },
  {
    _type: "aiApplicationItem" as const,
    _key: "ai-app-postproduction",
    id: "postproduction",
    number: "04",
    title: locString(
      "BILD & VIDEO POSTPRODUCTION",
      "IMAGE & VIDEO POSTPRODUCTION",
    ),
    description: locText(
      "Retusche, Erweiterungen, Anpassungen, Compositing und weitere KI-gestützte Verfahren ergänzen unsere klassischen Postproduction-Workflows.",
      "Retouching, extensions, adaptations, compositing and other AI-assisted techniques complement our established postproduction workflows.",
    ),
  },
  {
    _type: "aiApplicationItem" as const,
    _key: "ai-app-generation",
    id: "generation",
    number: "05",
    title: locString("BILD- & VIDEOGENERIERUNG", "IMAGE & VIDEO GENERATION"),
    description: locText(
      "Wir generieren hochwertige visuelle Inhalte und kombinieren KI-generierte Elemente bei Bedarf mit realer Fotografie, Film oder bestehenden Assets.",
      "We create high-quality visual content and, where appropriate, combine AI-generated elements with real photography, film or existing assets.",
    ),
  },
  {
    _type: "aiApplicationItem" as const,
    _key: "ai-app-visualisation",
    id: "visualisation",
    number: "06",
    title: locString(
      "3D VISUALISIERUNG & ANIMATION",
      "3D VISUALISATION & ANIMATION",
    ),
    description: locText(
      "KI erweitert unsere etablierten 3D-Workflows – von Konzept und Materialentwicklung bis zur Optimierung und Weiterverarbeitung von Visualisierungen und Animationen.",
      "AI expands our established 3D workflows – from concept and material development to the optimisation and further processing of visualisations and animations.",
    ),
  },
];

/**
 * Document body for `_type: "ai"` / `_id: "ai"`.
 * No `_id` / `_type` here — schema initialValue and the migrate script add those.
 */
export const aiPageInitialValues = {
  heroSection: {
    label: locString("KÜNSTLICHE INTELLIGENZ", "ARTIFICIAL INTELLIGENCE"),
    headline: locString(
      "KI. Wenn Erfahrung\nauf neue Möglichkeiten trifft.",
      "AI. Where experience\nmeets new possibilities.",
    ),
    text: locText(
      "Studiojeker integriert künstliche Intelligenz in einen etablierten Produktionsprozess: Strategie, kreative Konzeption, Fotografie, Film, 3D – und gezielte Distribution über digitale Kanäle. KI beschleunigt dort, wo sie Mehrwert schafft. Studiojeker liefert Konzept, Handwerk, Qualität und Sichtbarkeit.",
      "Studiojeker integrates artificial intelligence into an established production process: strategy, creative concept, photography, film, 3D – and targeted distribution across digital channels. AI accelerates where it adds value. Studiojeker delivers concept, craft, quality and visibility.",
    ),
    media: {
      _type: "mediaField" as const,
      mediaType: "image",
      // Image asset left empty — editors upload in Studio.
    },
  },
  introSection: {
    headline: locString(
      "KI ist für uns ein Werkzeug. Ein verdammt gutes.",
      "AI is a tool. An incredibly powerful one.",
    ),
    text: locText(
      joinParagraphs([
        "Künstliche Intelligenz erweitert die Möglichkeiten visueller Kommunikation. Für Studiojeker ersetzt sie weder Ideen, Erfahrung noch gestalterisches Know-how – und wir positionieren uns nicht als reine AI-Agentur.",
        "Wir verbinden Strategie, kreative Konzeption, klassische Content-Produktion und KI zu einem durchgängigen Workflow – von der ersten Idee über die Produktion bis zur Distribution in Social Media und weiteren digitalen Kanälen.",
        "Entscheidend ist nicht, welche Technologie eingesetzt wird, sondern was am Ende entsteht: maximale Qualität, starke visuelle Kommunikation und eine Produktion, die für unsere Kunden wirtschaftlich sinnvoll ist.",
      ]),
      joinParagraphs([
        "Artificial intelligence expands what is possible in visual communication. At Studiojeker it does not replace ideas, experience or professional design expertise – and it does not turn us into a pure AI agency.",
        "We combine strategy, creative concept, classical content production and AI into one continuous workflow – from the first idea through production to distribution on social media and other digital channels.",
        "What matters is not which technology is used, but what we create with it: maximum quality, strong visual communication and production that makes economic sense for our clients.",
      ]),
    ),
  },
  processSection: {
    label: locString("Prozess", "Process"),
    headline: locString(
      "Vom Konzept zur Sichtbarkeit.",
      "From concept to visibility.",
    ),
    introduction: locText(
      "Ein durchgängiger Ablauf: Konzept, Produktion, KI wo sie hilft, Distribution über die Kanäle – und nachhaltige Sichtbarkeit.",
      "One continuous path: concept, production, AI where it helps, distribution across channels – and lasting visibility.",
    ),
    steps: processSteps,
  },
  showreelSection: {
    label: locString("Showreel", "Showreel"),
    headline: locString(
      "KI im Studiojeker-Prozess",
      "AI in the Studiojeker process",
    ),
    text: locText(
      "Wie Konzept, Produktion, KI und Distribution zusammenspielen – für Content, der Sichtbarkeit schafft.",
      "How concept, production, AI and distribution come together – for content that creates visibility.",
    ),
    cta: {
      _type: "ctaField" as const,
      label: locString("PROJEKT BESPRECHEN", "DISCUSS YOUR PROJECT"),
      href: "/contact",
    },
    media: {
      _type: "mediaField" as const,
      mediaType: "video",
      vimeoUrl: "https://vimeo.com/1228871502",
    },
  },
  applicationsSection: {
    headline: locString("Wo wir KI einsetzen", "Where we use AI"),
    items: applications,
  },
  modelsSection: {
    headline: locString(
      "Die besten Modelle. Das richtige Know-how.",
      "The best models. The right expertise.",
    ),
    text: locText(
      joinParagraphs([
        "Die Entwicklung im Bereich künstlicher Intelligenz ist extrem dynamisch. Deshalb legen wir uns nicht auf einzelne Plattformen oder Modelle fest.",
        "Studiojeker arbeitet projektbezogen mit den jeweils leistungsfähigsten verfügbaren KI-Modellen und Technologien. Entscheidend ist, für jede Aufgabe das richtige Werkzeug einzusetzen.",
        "Unsere Spezialisten beschäftigen sich kontinuierlich mit neuen Modellen, Workflows und Produktionsmethoden – immer im Dienst von Konzept, Handwerk und Distribution.",
      ]),
      joinParagraphs([
        "Artificial intelligence is evolving at extraordinary speed. That is why we do not commit ourselves to individual platforms or models.",
        "Studiojeker works with the most capable AI models and technologies available for each specific project. The key is choosing the right tool for the task.",
        "Our specialists continuously explore new models, workflows and production methods – always in service of concept, craft and distribution.",
      ]),
    ),
  },
  experienceSection: {
    headline: locString("KI + Erfahrung", "AI + Experience"),
    text: locText(
      joinParagraphs([
        "Ein gutes KI-Modell allein produziert noch keine gute Kommunikation.",
        "Qualität entsteht durch Ideen, Erfahrung, Art Direction, präzise Prompts, Auswahl, Kontrolle und professionelle Weiterverarbeitung.",
        "Genau hier liegt unsere Stärke: Wir verbinden neue KI-Technologien mit jahrzehntelanger Erfahrung in visueller Kommunikation, Content-Produktion und kanalgerechter Ausspielung.",
      ]),
      joinParagraphs([
        "A powerful AI model alone does not create powerful communication.",
        "Quality comes from ideas, experience, art direction, precise prompting, selection, control and professional postproduction.",
        "This is where our strength lies: combining new AI technologies with decades of experience in visual communication, content production and channel-ready delivery.",
      ]),
    ),
  },
  approachSection: {
    headline: locString(
      "Gezielt. Verantwortungsbewusst. Effizient.",
      "Focused. Responsible. Efficient.",
    ),
    text: locText(
      joinParagraphs([
        "Wir setzen KI bewusst und projektbezogen ein. Nicht alles, was technisch möglich ist, ist für jedes Projekt sinnvoll.",
        "Unser Ziel ist deshalb nicht maximaler KI-Einsatz, sondern der optimale Produktionsprozess für die jeweilige Aufgabe – inklusive Distribution.",
        "Wo KI bessere Resultate, zusätzliche kreative Möglichkeiten oder eine effizientere Produktion ermöglicht, nutzen wir sie. Wo klassische Fotografie, Filmproduktion, 3D oder menschliche Kreativarbeit die bessere Lösung ist, setzen wir weiterhin darauf.",
        "So entsteht für unsere Kunden die bestmögliche Kombination aus Qualität, Kreativität und Kosteneffizienz.",
      ]),
      joinParagraphs([
        "We use AI consciously and according to the requirements of each project. Not everything that is technically possible makes sense for every production.",
        "Our goal is therefore not to maximise the use of AI, but to create the best possible production process for each task – including distribution.",
        "Where AI delivers better results, additional creative possibilities or greater production efficiency, we use it. Where traditional photography, filmmaking, 3D or human creative work is the better solution, we continue to rely on those methods.",
        "The result is the best possible combination of quality, creativity and cost efficiency for our clients.",
      ]),
    ),
  },
  // visualMedia and landscapeBreaks stay empty — editors upload originals in Studio.
  closingSection: {
    headline: locString(
      "Was können wir mit KI für Sie möglich machen?",
      "What can we make possible with AI?",
    ),
    text: locText(
      "Erzählen Sie uns von Ihrer Idee. Wir zeigen Ihnen, welche Kombination aus Strategie, klassischer Produktion, 3D, KI und Distribution dafür am meisten Sinn macht.",
      "Tell us about your idea. We will show you which combination of strategy, classical production, 3D, AI and distribution makes the most sense.",
    ),
    cta: {
      _type: "ctaField" as const,
      label: locString("PROJEKT BESPRECHEN", "DISCUSS YOUR PROJECT"),
      href: "/contact",
    },
  },
  clientsLabel: locString("Ausgewählte Kunden", "Selected clients"),
  seoSection: {
    title: locString(
      "KI für Bild, Video & 3D | Studiojeker",
      "AI for Image, Video & 3D | Studiojeker",
    ),
    description: locText(
      "Studiojeker verbindet Strategie, kreative Konzeption, klassische Content-Produktion und KI zu einem durchgängigen Prozess – von der Idee bis zur Distribution und Sichtbarkeit.",
      "Studiojeker combines strategy, creative concept, classical content production and AI into one continuous process – from idea to distribution and visibility.",
    ),
  },
};
