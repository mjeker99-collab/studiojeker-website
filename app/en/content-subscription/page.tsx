import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { AboLandingPageLive } from "@/components/abo/AboLandingPageLive";
import { aboLanguageAlternates } from "@/lib/content/abo-page";
import { getResolvedAboContent } from "@/lib/content/abo-sanity";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getResolvedAboContent("en");

  return buildPageMetadata({
    locale: "en",
    pathname: "/content-subscription",
    title: content.seo.title,
    description: content.seo.description,
    ogImagePath: content.seo.ogImagePath,
    languageAlternates: aboLanguageAlternates,
  });
}

export default async function EnglishContentSubscriptionPage() {
  const content = await getResolvedAboContent("en");

  return (
    <SiteChrome locale="en">
      <AboLandingPageLive key="en" locale="en" content={content} />
    </SiteChrome>
  );
}
