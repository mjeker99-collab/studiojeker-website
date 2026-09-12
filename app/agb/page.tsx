import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { SimpleContentPage } from "@/components/pages/SimpleContentPage";
import { agbDeBlocks, agbDeTitle } from "@/lib/content/legal-agb-de";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  locale: "de",
  pathname: "/agb",
  title: "AGB | Studiojeker",
  description: "Allgemeine Geschäftsbedingungen der Studiojeker GmbH.",
  // No English AGB page yet — keep hreflang on the German route.
  languageAlternates: { de: "/agb", en: "/agb" },
});

export default function GermanAgbPage() {
  return (
    <SiteChrome locale="de">
      <SimpleContentPage
        label="Rechtliches"
        title={agbDeTitle}
        blocks={agbDeBlocks}
      />
    </SiteChrome>
  );
}
