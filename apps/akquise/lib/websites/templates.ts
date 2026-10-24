import {
  blankWebsite,
  blankPage,
  blankSection,
  type WebsiteDocument,
} from "./input";

type PagePlan = { slug: string; title: string; sections: string[] };
type Template = {
  id: string;
  name: string;
  description: string;
  style: WebsiteDocument["template"];
  pages: PagePlan[];
};
const contact: PagePlan = {
  slug: "kontakt",
  title: "Kontakt",
  sections: [
    "Ansprechperson",
    "Kontaktmöglichkeiten",
    "Standort und Erreichbarkeit",
  ],
};
export const websiteTemplates: Template[] = [
  {
    id: "company",
    name: "Firmenwebsite / KMU",
    description:
      "Leistungen erklären, Vertrauen aufbauen und Anfragen gewinnen.",
    style: "EDITORIAL",
    pages: [
      {
        slug: "index",
        title: "Startseite",
        sections: [
          "Das Unternehmen im Überblick",
          "Unsere Leistungen",
          "So arbeiten wir",
          "Kontakt aufnehmen",
        ],
      },
      {
        slug: "leistungen",
        title: "Leistungen",
        sections: [
          "Leistung 1",
          "Leistung 2",
          "Leistung 3",
          "Der Weg zur Zusammenarbeit",
        ],
      },
      {
        slug: "ueber-uns",
        title: "Über uns",
        sections: ["Unsere Geschichte", "Team", "Unsere Arbeitsweise"],
      },
      {
        slug: "referenzen",
        title: "Referenzen",
        sections: ["Projekt 1", "Projekt 2", "Projekt 3"],
      },
      contact,
    ],
  },
  {
    id: "campaign",
    name: "Kampagnen-Landingpage",
    description:
      "Ein Angebot, ein klares Ziel und ein direkter nächster Schritt.",
    style: "CAMPAIGN",
    pages: [
      {
        slug: "index",
        title: "Kampagne",
        sections: [
          "Für wen ist das Angebot?",
          "Ihr Nutzen",
          "Das Angebot",
          "Häufige Fragen",
          "Jetzt Kontakt aufnehmen",
        ],
      },
      contact,
    ],
  },
  {
    id: "portfolio",
    name: "Portfolio / Kreativstudio",
    description: "Bildstarker Einstieg und Raum für ausgewählte Arbeiten.",
    style: "PORTFOLIO",
    pages: [
      {
        slug: "index",
        title: "Startseite",
        sections: [
          "Unsere Arbeit",
          "Ausgewählte Projekte",
          "Gemeinsam etwas bewegen",
        ],
      },
      {
        slug: "projekte",
        title: "Projekte",
        sections: ["Projekt 1", "Projekt 2", "Projekt 3"],
      },
      {
        slug: "leistungen",
        title: "Leistungen",
        sections: ["Konzeption", "Produktion", "Umsetzung"],
      },
      {
        slug: "team",
        title: "Team",
        sections: ["Die Menschen dahinter", "Unsere Arbeitsweise"],
      },
      contact,
    ],
  },
  {
    id: "property",
    name: "Immobilien / Architektur",
    description:
      "Objekt, Bildstrecke, Eckdaten und Grundrisse übersichtlich präsentieren.",
    style: "PORTFOLIO",
    pages: [
      {
        slug: "index",
        title: "Objektübersicht",
        sections: [
          "Das Objekt",
          "Eckdaten",
          "Lage und Umgebung",
          "Besichtigung anfragen",
        ],
      },
      {
        slug: "bilder",
        title: "Bilder",
        sections: ["Aussenansicht", "Innenräume", "Details"],
      },
      {
        slug: "grundrisse",
        title: "Grundrisse",
        sections: ["Grundriss und Raumaufteilung", "Weitere Pläne"],
      },
      contact,
    ],
  },
  {
    id: "product",
    name: "Produkt / Dienstleistung",
    description: "Vorteile, Anwendung und Varianten bis zur Anfrage führen.",
    style: "EDITORIAL",
    pages: [
      {
        slug: "index",
        title: "Übersicht",
        sections: [
          "Produkt oder Dienstleistung",
          "Die Vorteile",
          "So funktioniert es",
          "Beratung anfragen",
        ],
      },
      {
        slug: "anwendung",
        title: "Anwendung",
        sections: ["Einsatzbereich", "Anwendungsschritte", "Häufige Fragen"],
      },
      {
        slug: "varianten",
        title: "Varianten",
        sections: ["Variante 1", "Variante 2", "Welche Lösung passt?"],
      },
      contact,
    ],
  },
  {
    id: "subscription",
    name: "Abo / Angebotspakete",
    description: "Pakete vergleichen, Ablauf erklären und Beratung anbieten.",
    style: "CAMPAIGN",
    pages: [
      {
        slug: "index",
        title: "Abo entdecken",
        sections: [
          "Der Nutzen",
          "Paket 1",
          "Paket 2",
          "Paket 3",
          "So läuft die Zusammenarbeit",
          "Aktionsangebot",
          "Häufige Fragen",
          "Beratung anfragen",
        ],
      },
      contact,
    ],
  },
];

export function createWebsiteFromTemplate(id: string): WebsiteDocument {
  const template = websiteTemplates.find((t) => t.id === id);
  if (!template) throw new Error("Website-Vorlage nicht gefunden.");
  return {
    ...structuredClone(blankWebsite),
    name: template.name,
    template: template.style,
    briefing: `Grundtemplate: ${template.name}. Ziel: [Ziel und Zielgruppe ergänzen]. Nur bestätigte Kundenangaben verwenden. Platzhalter ersetzen; keine Fakten, Referenzen, Preise oder Aktionsfristen erfinden. Rechtliche Angaben vor Veröffentlichung ergänzen.`,
    footer: "[Unternehmen · Kontakt · rechtliche Angaben ergänzen]",
    pages: template.pages.map((p) => ({
      ...structuredClone(blankPage),
      slug: p.slug,
      title: p.title,
      headline: p.slug === "index" ? "[Ihr Angebot auf den Punkt]" : p.title,
      intro:
        p.slug === "index"
          ? "[Für wen ist Ihr Angebot? Welchen konkreten Nutzen bieten Sie? Hier in zwei Sätzen erklären.]"
          : `[Einleitung für ${p.title} ergänzen.]`,
      seoTitle: p.title,
      seoDescription: "[Passende Seitenbeschreibung ergänzen]",
      sections: p.sections.map((heading, i) => ({
        ...blankSection,
        heading,
        body:
          heading === "Aktionsangebot"
            ? "[Angebot, Konditionen und Gültigkeit ergänzen oder diesen Abschnitt entfernen.]"
            : heading.startsWith("Paket")
              ? "[Zielgruppe, enthaltene Leistungen, Umfang und bestätigte Konditionen dieses Pakets ergänzen.]"
              : `[Inhalt für «${heading}» ergänzen. Nur bestätigte Angaben verwenden.]`,
        layout: /anfragen|aufnehmen|bewegen/.test(heading)
          ? "BANNER"
          : i % 2 === 0
            ? "SPLIT"
            : "TEXT",
        imageAlt: `[Passendes Bild für ${heading} auswählen und beschreiben]`,
        ctaLabel:
          /anfragen|aufnehmen|bewegen/.test(heading) && p.slug !== "kontakt"
            ? "Kontakt aufnehmen"
            : "",
        ctaUrl:
          /anfragen|aufnehmen|bewegen/.test(heading) && p.slug !== "kontakt"
            ? "kontakt.html"
            : "",
      })),
    })),
  };
}
