import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { AboutPage } from "@/components/about/AboutPage";
import { getAboutPageContent } from "@/lib/content/about-page";
import { buildPageMetadata } from "@/lib/seo/metadata";

const content = getAboutPageContent("en");

export const metadata: Metadata = buildPageMetadata({
  locale: "en",
  pathname: "/about",
  title: content.seo.title,
  description: content.seo.description,
});

export default function EnglishAboutPage() {
  return (
    <SiteChrome locale="en">
      <AboutPage content={content} />
    </SiteChrome>
  );
}
