import type { Locale } from "@/types/i18n";
import { getHomepageContent } from "@/lib/content/homepage";
import type { WorkPageContent } from "@/components/work/WorkPage";

export function getWorkPageContent(locale: Locale): WorkPageContent {
  const home = getHomepageContent(locale);

  if (locale === "en") {
    return {
      seo: {
        title: "Work | Studiojeker",
        description:
          "Selected projects and visual communication work by Studiojeker.",
      },
      hero: {
        label: "Work",
        headline: "Selected projects.",
        text: "Approved case studies will replace these category placeholders. Until then, cards lead to this overview.",
      },
      projects: {
        ...home.projects,
        label: "Projects",
        headline: "Projects",
      },
      finalCta: home.finalCta,
    };
  }

  return {
    seo: {
      title: "Work | Studiojeker",
      description:
        "Ausgewählte Projekte und visuelle Kommunikation von Studiojeker.",
    },
    hero: {
      label: "Work",
      headline: "Ausgewählte Projekte.",
      text: "Freigegebene Case Studies ersetzen diese Kategorie-Platzhalter. Bis dahin führen die Karten auf diese Übersicht.",
    },
    projects: {
      ...home.projects,
      label: "Projekte",
      headline: "Projekte",
    },
    finalCta: home.finalCta,
  };
}
