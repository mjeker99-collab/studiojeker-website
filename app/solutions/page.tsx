import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { ServicesSection } from "@/components/home/ServicesSection";
import { FinalCtaSection } from "@/components/home/FinalCtaSection";
import { getHomepageContent } from "@/lib/content/homepage";
import { buildPageMetadata } from "@/lib/seo/metadata";

const content = getHomepageContent("de");

export const metadata: Metadata = buildPageMetadata({
  locale: "de",
  pathname: "/solutions",
  title: "Leistungen | Studiojeker",
  description:
    "Architecture, Product Communication, Business Communication und Digital Marketing — visuelle Kommunikation für Unternehmen.",
});

/** Lightweight services hub — reuses homepage services grid. */
export default function GermanSolutionsIndexPage() {
  return (
    <SiteChrome locale="de">
      <div style={{ paddingTop: "var(--header-height)" }}>
        <ServicesSection content={content.services} />
        <FinalCtaSection content={content.finalCta} />
      </div>
    </SiteChrome>
  );
}
