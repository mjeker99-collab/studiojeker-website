import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { ContactPageLive } from "@/components/contact/ContactPageLive";
import { getResolvedContactContent } from "@/lib/content/contact-sanity";
import { getHomepageContent } from "@/lib/content/homepage";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const clientsLabel = getHomepageContent("de").clients.label;
  const content = await getResolvedContactContent("de", clientsLabel);

  return buildPageMetadata({
    locale: "de",
    pathname: "/contact",
    title: content.seo.title,
    description: content.seo.description,
    ogImagePath: content.seo.ogImagePath,
  });
}

export default async function GermanContactPage() {
  const clientsLabel = getHomepageContent("de").clients.label;
  const content = await getResolvedContactContent("de", clientsLabel);

  return (
    <SiteChrome locale="de">
      <ContactPageLive
        key="de"
        locale="de"
        content={content}
        clientsLabel={clientsLabel}
      />
    </SiteChrome>
  );
}
