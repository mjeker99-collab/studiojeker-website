import { placesWithin } from "./geo";
import { LEAD_RESEARCH_DEFAULTS, type ResearchConfig } from "./types";

export interface SourceFamily {
  id: string;
  label: string;
  homepage: string | null;
  query: (industry: string, place: string, pass: number) => string;
}

export const SOURCE_FAMILIES: SourceFamily[] = [
  {
    id: "gewerbeverein",
    label: "Gewerbevereine",
    homepage: null,
    query: (industry, place, pass) =>
      `Gewerbeverein ${place} ${industry} ${pass ? "Inhaber" : "Mitglieder"}`,
  },
  {
    id: "heso",
    label: "HESO",
    homepage: "https://www.heso.ch/",
    query: (industry, place) => `HESO Aussteller ${industry} ${place}`,
  },
  {
    id: "sohk",
    label: "SOHK",
    homepage: "https://www.sohk.ch/",
    query: (industry, place) => `Solothurner Handelskammer ${industry} ${place}`,
  },
  {
    id: "ihvg",
    label: "IHVG",
    homepage: null,
    query: (industry, place) => `IHVG ${industry} ${place}`,
  },
  {
    id: "vssm",
    label: "VSSM",
    homepage: "https://www.vssm.ch/",
    query: (industry, place) => `VSSM Schreinerei ${industry} ${place}`,
  },
  {
    id: "suissetec",
    label: "suissetec",
    homepage: "https://www.suissetec.ch/",
    query: (industry, place) => `suissetec ${place} ${industry}`,
  },
  {
    id: "eit",
    label: "EIT.swiss",
    homepage: "https://www.eit.swiss/",
    query: (industry, place) => `EIT.swiss Elektro ${industry} ${place}`,
  },
  {
    id: "website",
    label: "Unternehmenswebsite",
    homepage: null,
    query: (industry, place, pass) =>
      `${industry} ${place} ${pass ? "Inhaber" : "Geschäftsführer"} KMU`,
  },
];

export function planPlaces(config: ResearchConfig): string[] {
  const places = placesWithin(config.center, config.radiusKm).map((place) => place.name);
  return places.length ? places : [config.regionLabel];
}

export function buildQuery(config: ResearchConfig, cursor: {
  sourceIndex: number;
  industryIndex: number;
  placeIndex: number;
  pass: number;
}): { label: string; text: string; homepage: string | null } | null {
  const source = SOURCE_FAMILIES[cursor.sourceIndex];
  const industry = config.industries[cursor.industryIndex];
  const place = planPlaces(config)[cursor.placeIndex];
  if (!source || !industry || !place) return null;
  return {
    label: source.label,
    text: `${source.id}::${source.query(industry, place, cursor.pass)}`,
    homepage: source.homepage,
  };
}

export function defaultIndustries(): string[] {
  return [...LEAD_RESEARCH_DEFAULTS.industries];
}
