import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { SimpleContentPage } from "@/components/pages/SimpleContentPage";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  locale: "en",
  pathname: "/datenschutz",
  title: "Privacy | Studiojeker",
  description: "Privacy policy of Studiojeker.",
});

export default function EnglishDatenschutzPage() {
  return (
    <SiteChrome locale="en">
      <SimpleContentPage
        label="Legal"
        title="Privacy"
        body={[
          "The full privacy policy will follow with approved legal copy.",
          "Until then, this website only processes data you deliberately submit.",
        ]}
      />
    </SiteChrome>
  );
}
