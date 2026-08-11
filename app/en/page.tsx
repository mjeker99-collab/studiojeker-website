import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { HomePage } from "@/components/home/HomePage";
import { getHomepageContent } from "@/lib/content/homepage";
import { buildPageMetadata } from "@/lib/seo/metadata";

const content = getHomepageContent("en");

export const metadata: Metadata = buildPageMetadata({
  locale: "en",
  pathname: "/",
  title: content.seo.title,
  description: content.seo.description,
});

export default function EnglishHomePage() {
  return (
    <SiteChrome locale="en">
      <HomePage locale="en" />
    </SiteChrome>
  );
}
