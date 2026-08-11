import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { SimpleContentPage } from "@/components/pages/SimpleContentPage";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  locale: "de",
  pathname: "/insights",
  title: "Insights | Studiojeker",
  description: "Insights und Fachbeiträge von Studiojeker — Inhalte folgen.",
});

export default function GermanInsightsPage() {
  return (
    <SiteChrome locale="de">
      <SimpleContentPage
        label="Insights"
        title="Insights"
        body={[
          "Diese Seite ist in der Informationsarchitektur vorgesehen.",
          "Freigegebene Artikel und Beiträge werden hier veröffentlicht, sobald sie verfügbar sind.",
        ]}
      />
    </SiteChrome>
  );
}
