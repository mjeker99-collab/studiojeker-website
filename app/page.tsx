import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { HomePage } from "@/components/home/HomePage";
import { getHomepageContent } from "@/lib/content/homepage";
import { buildPageMetadata } from "@/lib/seo/metadata";

const content = getHomepageContent("de");

export const metadata: Metadata = buildPageMetadata({
  locale: "de",
  pathname: "/",
  title: content.seo.title,
  description: content.seo.description,
});

export default function GermanHomePage() {
  return (
    <SiteChrome locale="de">
      <HomePage locale="de" />
    </SiteChrome>
  );
}
