import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { ContactPageLive } from "@/components/contact/ContactPageLive";
import { getResolvedContactContent } from "@/lib/content/contact-sanity";
import { getHomepageContent } from "@/lib/content/homepage";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const clientsLabel = getHomepageContent("en").clients.label;
  const content = await getResolvedContactContent("en", clientsLabel);

  return buildPageMetadata({
    locale: "en",
    pathname: "/contact",
    title: content.seo.title,
    description: content.seo.description,
    ogImagePath: content.seo.ogImagePath,
  });
}

export default async function EnglishContactPage() {
  const clientsLabel = getHomepageContent("en").clients.label;
  const content = await getResolvedContactContent("en", clientsLabel);

  return (
    <SiteChrome locale="en">
      <ContactPageLive
        key="en"
        locale="en"
        content={content}
        clientsLabel={clientsLabel}
      />
    </SiteChrome>
  );
}
