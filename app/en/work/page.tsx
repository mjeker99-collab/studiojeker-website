import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { WorkPage } from "@/components/work/WorkPage";
import { getResolvedWorkPageContent } from "@/lib/content/work-sanity";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getResolvedWorkPageContent("en");

  return buildPageMetadata({
    locale: "en",
    pathname: "/work",
    title: content.seo.title,
    description: content.seo.description,
  });
}

export default async function EnglishWorkPage() {
  const content = await getResolvedWorkPageContent("en");

  return (
    <SiteChrome locale="en">
      <WorkPage content={content} locale="en" />
    </SiteChrome>
  );
}
