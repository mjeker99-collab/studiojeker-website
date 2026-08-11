import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { WorkPage } from "@/components/work/WorkPage";
import { getWorkPageContent } from "@/lib/content/work-page";
import { buildPageMetadata } from "@/lib/seo/metadata";

const content = getWorkPageContent("de");

export const metadata: Metadata = buildPageMetadata({
  locale: "de",
  pathname: "/work",
  title: content.seo.title,
  description: content.seo.description,
});

export default function GermanWorkPage() {
  return (
    <SiteChrome locale="de">
      <WorkPage content={content} locale="de" />
    </SiteChrome>
  );
}
