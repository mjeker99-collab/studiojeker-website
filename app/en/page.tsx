import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { HomePage } from "@/components/home/HomePage";
import { getResolvedHomepageContent } from "@/lib/content/homepage-sanity";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getResolvedHomepageContent("en");

  return buildPageMetadata({
    locale: "en",
    pathname: "/",
    title: content.seo.title,
    description: content.seo.description,
    ogImagePath: content.seo.ogImagePath,
  });
}

export default async function EnglishHomePage() {
  const content = await getResolvedHomepageContent("en");

  return (
    <SiteChrome locale="en">
      <HomePage locale="en" content={content} />
    </SiteChrome>
  );
}
