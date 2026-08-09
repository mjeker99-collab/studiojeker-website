import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { WorkPage } from "@/components/work/WorkPage";
import { getWorkPageContent } from "@/lib/content/work-page";
import { buildPageMetadata } from "@/lib/seo/metadata";

const content = getWorkPageContent("en");

export const metadata: Metadata = buildPageMetadata({
  locale: "en",
  pathname: "/work",
  title: content.seo.title,
  description: content.seo.description,
});

export default function EnglishWorkPage() {
  return (
    <SiteChrome locale="en">
      <WorkPage content={content} />
    </SiteChrome>
  );
}
