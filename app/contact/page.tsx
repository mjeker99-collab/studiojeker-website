import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { ContactPage } from "@/components/contact/ContactPage";
import { getContactPageContent } from "@/lib/content/contact";
import { getHomepageContent } from "@/lib/content/homepage";
import { buildPageMetadata } from "@/lib/seo/metadata";

const content = getContactPageContent("de");
const clientsLabel = getHomepageContent("de").clients.label;

export const metadata: Metadata = buildPageMetadata({
  locale: "de",
  pathname: "/contact",
  title: content.seo.title,
  description: content.seo.description,
});

export default function GermanContactPage() {
  return (
    <SiteChrome locale="de">
      <ContactPage content={content} clientsLabel={clientsLabel} locale="de" />
    </SiteChrome>
  );
}
