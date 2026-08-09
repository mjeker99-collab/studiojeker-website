import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { ServicesSection } from "@/components/home/ServicesSection";
import { FinalCtaSection } from "@/components/home/FinalCtaSection";
import { getHomepageContent } from "@/lib/content/homepage";
import { buildPageMetadata } from "@/lib/seo/metadata";

const content = getHomepageContent("en");

export const metadata: Metadata = buildPageMetadata({
  locale: "en",
  pathname: "/solutions",
  title: "Services | Studiojeker",
  description:
    "Architecture, Product Communication, Business Communication and Digital Marketing — visual communication for businesses.",
});

export default function EnglishSolutionsIndexPage() {
  return (
    <SiteChrome locale="en">
      <div style={{ paddingTop: "var(--header-height)" }}>
        <ServicesSection content={content.services} />
        <FinalCtaSection content={content.finalCta} />
      </div>
    </SiteChrome>
  );
}
