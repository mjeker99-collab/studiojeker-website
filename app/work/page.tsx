import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { WorkPage } from "@/components/work/WorkPage";
import { getResolvedWorkPageContent } from "@/lib/content/work-sanity";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getResolvedWorkPageContent("de");

  return buildPageMetadata({
    locale: "de",
    pathname: "/work",
    title: content.seo.title,
    description: content.seo.description,
  });
}

export default async function GermanWorkPage() {
  const content = await getResolvedWorkPageContent("de");

  return (
    <SiteChrome locale="de">
      <WorkPage content={content} locale="de" />
    </SiteChrome>
  );
}
