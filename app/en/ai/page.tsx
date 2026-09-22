import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { AiPageLive } from "@/components/ai/AiPageLive";
import { aiLanguageAlternates } from "@/lib/content/ai-page";
import { getResolvedAiPageContent } from "@/lib/content/ai-sanity";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getResolvedAiPageContent("en");
  return buildPageMetadata({
    locale: "en",
    pathname: "/ai",
    title: content.seo.title,
    description: content.seo.description,
    ogImagePath: content.seo.ogImagePath,
    languageAlternates: aiLanguageAlternates,
  });
}

export default async function EnglishAiPage() {
  const content = await getResolvedAiPageContent("en");

  return (
    <SiteChrome locale="en">
      <AiPageLive key="en" locale="en" content={content} />
    </SiteChrome>
  );
}
