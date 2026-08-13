import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { HomePage } from "@/components/home/HomePage";
import { getResolvedHomepageContent } from "@/lib/content/homepage-sanity";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getResolvedHomepageContent("de");

  return buildPageMetadata({
    locale: "de",
    pathname: "/",
    title: content.seo.title,
    description: content.seo.description,
  });
}

export default async function GermanHomePage() {
  const content = await getResolvedHomepageContent("de");

  return (
    <SiteChrome locale="de">
      <HomePage locale="de" content={content} />
    </SiteChrome>
  );
}
