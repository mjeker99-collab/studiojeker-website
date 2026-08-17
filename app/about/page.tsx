import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { AboutPage } from "@/components/about/AboutPage";
import { getResolvedAboutPageContent } from "@/lib/content/about-sanity";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getResolvedAboutPageContent("de");

  return buildPageMetadata({
    locale: "de",
    pathname: "/about",
    title: content.seo.title,
    description: content.seo.description,
  });
}

export default async function GermanAboutPage() {
  const content = await getResolvedAboutPageContent("de");

  return (
    <SiteChrome locale="de">
      <AboutPage content={content} />
    </SiteChrome>
  );
}
