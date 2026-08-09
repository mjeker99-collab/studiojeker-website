import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { SimpleContentPage } from "@/components/pages/SimpleContentPage";
import { studiojekerContact } from "@/lib/content/contact";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  locale: "en",
  pathname: "/impressum",
  title: "Imprint | Studiojeker",
  description: "Legal imprint of studiojeker GmbH.",
});

export default function EnglishImpressumPage() {
  return (
    <SiteChrome locale="en">
      <SimpleContentPage
        label="Legal"
        title="Imprint"
        body={[
          `${studiojekerContact.company}`,
          `${studiojekerContact.street}, ${studiojekerContact.postalCode} ${studiojekerContact.city}`,
          `Email: ${studiojekerContact.email}`,
          `Phone: ${studiojekerContact.phoneDisplay}`,
          "The full legal imprint text will follow with approved legal copy.",
        ]}
      />
    </SiteChrome>
  );
}
