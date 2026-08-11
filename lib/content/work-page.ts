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
        text: "A selection of our work in photography, film, 3D and marketing.",
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
      text: "Eine Auswahl unserer Arbeit in Fotografie, Film, 3D und Marketing.",
    },
    projects: {
      ...home.projects,
      label: "Projekte",
      headline: "Projekte",
    },
    finalCta: home.finalCta,
  };
}
