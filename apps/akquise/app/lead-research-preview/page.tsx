import { notFound } from "next/navigation";
import { LeadResearchPanel } from "../LeadResearchPanel";
import type { LeadResearchView } from "../../lib/lead-research/types";

const sample = (patch: Partial<LeadResearchView>): LeadResearchView => ({
  enabled: true,
  status: "IDLE",
  statusLabel: "Bereit zum Start",
  region: "Solothurn",
  radiusKm: 10,
  target: 200,
  audience: "Gewerbe und kleine KMU",
  employeeMin: 5,
  employeeMax: 50,
  priceChf: 650,
  promoUntil: "2026-11-30",
  promoActive: true,
  industries: ["Handwerk", "Gebäudetechnik", "Holz- und Metallbau"],
  metrics: {
    target: 200,
    verifiedNew: 0,
    duplicates: 0,
    excluded: 0,
    openReviews: 0,
    legacyOpen: 4,
    draftsComplete: 0,
    exportReady: false,
    sheetsConfirmed: 0,
    shortfall: 200,
  },
  blockers: [],
  lastError: "",
  modeLabel: "Vorschau mit Beispieldaten. Keine Recherche und kein Versand.",
  sendBlocked: true,
  results: [],
  exportReady: false,
  ...patch,
});

export default function LeadResearchPreviewPage() {
  if (process.env.NODE_ENV === "production" || process.env.LEAD_RESEARCH_PREVIEW !== "true") {
    notFound();
  }
  return (
    <main style={{ padding: 24, background: "#f3f5f5" }}>
      <LeadResearchPanel live={false} seed={sample({})} />
      <LeadResearchPanel
        live={false}
        seed={sample({
          status: "BLOCKED",
          statusLabel: "Blockiert",
          blockers: [{
            id: "provider",
            message: "Die Suchquelle ist nicht eingerichtet. Es wird nichts erfunden.",
          }],
          metrics: {
            target: 200,
            verifiedNew: 0,
            duplicates: 0,
            excluded: 0,
            openReviews: 0,
            legacyOpen: 4,
            draftsComplete: 0,
            exportReady: false,
            sheetsConfirmed: 0,
            shortfall: 200,
          },
        })}
      />
    </main>
  );
}
