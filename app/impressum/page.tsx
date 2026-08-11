import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { SimpleContentPage } from "@/components/pages/SimpleContentPage";
import { studiojekerContact } from "@/lib/content/contact";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  locale: "de",
  pathname: "/impressum",
  title: "Impressum | Studiojeker",
  description: "Impressum der Studiojeker GmbH.",
});

export default function GermanImpressumPage() {
  return (
    <SiteChrome locale="de">
      <SimpleContentPage
        label="Rechtliches"
        title="Impressum"
        body={[
          `${studiojekerContact.company}`,
          `${studiojekerContact.street}`,
          `CH-${studiojekerContact.postalCode} ${studiojekerContact.city}`,
          studiojekerContact.country,
          `E-Mail: ${studiojekerContact.email}`,
          `Telefon: ${studiojekerContact.phoneDisplay}`,
        ]}
      />
    </SiteChrome>
  );
}
