import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { ServicePage } from "@/components/services/ServicePage";
import {
  getServicePageContent,
  isServicePageSlug,
  servicePageSlugs,
} from "@/lib/content/services";
import { serviceSlugToPath } from "@/lib/content/services/paths";
import { buildPageMetadata } from "@/lib/seo/metadata";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return servicePageSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isServicePageSlug(slug)) {
    return {};
  }

  const content = getServicePageContent(slug, "en");
  return buildPageMetadata({
    locale: "en",
    pathname: serviceSlugToPath[slug],
    title: content.seo.title,
    description: content.seo.description,
  });
}

export default async function EnglishServicePage({ params }: PageProps) {
  const { slug } = await params;
  if (!isServicePageSlug(slug)) {
    notFound();
  }

  const content = getServicePageContent(slug, "en");

  return (
    <SiteChrome locale="en">
      <ServicePage content={content} />
    </SiteChrome>
  );
}
