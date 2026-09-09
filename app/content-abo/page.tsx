import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { AboLandingPageLive } from "@/components/abo/AboLandingPageLive";
import { aboLanguageAlternates } from "@/lib/content/abo-page";
import { getResolvedAboContent } from "@/lib/content/abo-sanity";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getResolvedAboContent("de");

  return buildPageMetadata({
    locale: "de",
    pathname: "/content-abo",
    title: content.seo.title,
    description: content.seo.description,
    ogImagePath: content.seo.ogImagePath,
    languageAlternates: aboLanguageAlternates,
  });
}

export default async function GermanContentAboPage() {
  const content = await getResolvedAboContent("de");

  return (
    <SiteChrome locale="de">
      <AboLandingPageLive key="de" locale="de" content={content} />
    </SiteChrome>
  );
}
