import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { FoundationPage } from "@/components/foundation/FoundationPage";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  locale: "en",
  pathname: "/",
  title: "Studiojeker | Foundation",
  description: "Next.js foundation for the Studiojeker website.",
});

export default function EnglishHomePage() {
  return (
    <SiteChrome locale="en">
      <FoundationPage locale="en" />
    </SiteChrome>
  );
}
