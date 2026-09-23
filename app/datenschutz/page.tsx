import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { SimpleContentPage } from "@/components/pages/SimpleContentPage";
import { datenschutzDeBlocks } from "@/lib/content/legal-datenschutz-de";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  locale: "de",
  pathname: "/datenschutz",
  title: "Datenschutz | Studiojeker",
  description: "Datenschutzerklärung von Studiojeker.",
  // English `/en/datenschutz/` is a noindex placeholder — omit en hreflang.
  omitEnglishAlternate: true,
});

export default function GermanDatenschutzPage() {
  return (
    <SiteChrome locale="de">
      <SimpleContentPage
        label="Rechtliches"
        title="Datenschutz"
        blocks={datenschutzDeBlocks}
      />
    </SiteChrome>
  );
}
