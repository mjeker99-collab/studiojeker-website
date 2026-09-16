import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { AiPageLive } from "@/components/ai/AiPageLive";
import { aiLanguageAlternates } from "@/lib/content/ai-page";
import { getResolvedAiPageContent } from "@/lib/content/ai-sanity";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getResolvedAiPageContent("de");
  return buildPageMetadata({
    locale: "de",
    pathname: "/ki",
    title: content.seo.title,
    description: content.seo.description,
    ogImagePath: content.seo.ogImagePath,
    languageAlternates: aiLanguageAlternates,
  });
}

export default async function GermanAiPage() {
  const content = await getResolvedAiPageContent("de");

  return (
    <SiteChrome locale="de">
      <AiPageLive key="de" locale="de" content={content} />
    </SiteChrome>
  );
}
