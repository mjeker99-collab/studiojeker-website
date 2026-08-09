import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { ContactPage } from "@/components/contact/ContactPage";
import { getContactPageContent } from "@/lib/content/contact";
import { getHomepageContent } from "@/lib/content/homepage";
import { buildPageMetadata } from "@/lib/seo/metadata";

const content = getContactPageContent("en");
const clientsLabel = getHomepageContent("en").clients.label;

export const metadata: Metadata = buildPageMetadata({
  locale: "en",
  pathname: "/contact",
  title: content.seo.title,
  description: content.seo.description,
});

export default function EnglishContactPage() {
  return (
    <SiteChrome locale="en">
      <ContactPage content={content} clientsLabel={clientsLabel} />
    </SiteChrome>
  );
}
