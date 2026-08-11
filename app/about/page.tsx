import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { AboutPage } from "@/components/about/AboutPage";
import { getAboutPageContent } from "@/lib/content/about-page";
import { buildPageMetadata } from "@/lib/seo/metadata";

const content = getAboutPageContent("de");

export const metadata: Metadata = buildPageMetadata({
  locale: "de",
  pathname: "/about",
  title: content.seo.title,
  description: content.seo.description,
});

export default function GermanAboutPage() {
  return (
    <SiteChrome locale="de">
      <AboutPage content={content} />
    </SiteChrome>
  );
}
