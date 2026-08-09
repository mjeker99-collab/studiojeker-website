import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { SimpleContentPage } from "@/components/pages/SimpleContentPage";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  locale: "en",
  pathname: "/insights",
  title: "Insights | Studiojeker",
  description: "Insights and articles from Studiojeker — content coming soon.",
});

export default function EnglishInsightsPage() {
  return (
    <SiteChrome locale="en">
      <SimpleContentPage
        label="Insights"
        title="Insights"
        body={[
          "This page is reserved in the information architecture.",
          "Approved articles will be published here when available.",
        ]}
      />
    </SiteChrome>
  );
}
