import { studiojekerContact } from "@/lib/content/contact";
import { siteConfig } from "@/lib/site";

/**
 * Organization / LocalBusiness JSON-LD from verified company details only.
 * No opening hours, ratings, geo coordinates or social profiles invented.
 */
export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness"],
    name: studiojekerContact.company,
    url: siteConfig.getUrl(),
    email: studiojekerContact.email,
    telephone: studiojekerContact.phoneTel,
    address: {
      "@type": "PostalAddress",
      streetAddress: studiojekerContact.street,
      postalCode: studiojekerContact.postalCode,
      addressLocality: studiojekerContact.city,
      addressCountry: "CH",
    },
    foundingDate: siteConfig.since,
    description: siteConfig.positioning,
    logo: absoluteAsset("/logos/RZ_Studiojeker_Logo_RGB.svg"),
    image: absoluteAsset(siteConfig.defaultOgImage.path),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

function absoluteAsset(path: string): string {
  return `${siteConfig.getUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
