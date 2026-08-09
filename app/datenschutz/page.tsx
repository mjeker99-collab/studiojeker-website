import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { SimpleContentPage } from "@/components/pages/SimpleContentPage";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  locale: "de",
  pathname: "/datenschutz",
  title: "Datenschutz | Studiojeker",
  description: "Datenschutzerklärung von Studiojeker.",
});

export default function GermanDatenschutzPage() {
  return (
    <SiteChrome locale="de">
      <SimpleContentPage
        label="Rechtliches"
        title="Datenschutz"
        body={[
          "Die vollständige Datenschutzerklärung folgt mit freigegebenem Rechtstext.",
          "Bis dahin erfassen wir über diese Website nur die Daten, die Sie uns bewusst übermitteln.",
        ]}
      />
    </SiteChrome>
  );
}
