import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { AboutPage } from "@/components/about/AboutPage";
import { getResolvedAboutPageContent } from "@/lib/content/about-sanity";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getResolvedAboutPageContent("en");
  return buildPageMetadata({
    locale: "en",
    pathname: "/about",
    title: content.seo.title,
    description: content.seo.description,
  });
}

export default async function EnglishAboutPage() {
  const content = await getResolvedAboutPageContent("en");

  return (
    <SiteChrome locale="en">
      <AboutPage content={content} />
    </SiteChrome>
  );
}
