import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { FoundationPage } from "@/components/foundation/FoundationPage";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  locale: "de",
  pathname: "/",
  title: "Studiojeker | Foundation",
  description: "Next.js foundation for the Studiojeker website.",
});

export default function GermanHomePage() {
  return (
    <SiteChrome locale="de">
      <FoundationPage locale="de" />
    </SiteChrome>
  );
}
