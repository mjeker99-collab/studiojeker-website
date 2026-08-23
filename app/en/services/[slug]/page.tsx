import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { ServicePageLive } from "@/components/services/ServicePageLive";
import {
  isServicePageSlug,
  servicePageSlugs,
} from "@/lib/content/services";
import { getResolvedServiceContent } from "@/lib/content/service-sanity";
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

  const content = await getResolvedServiceContent(slug, "en");
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

  const content = await getResolvedServiceContent(slug, "en");

  return (
    <SiteChrome locale="en">
      <ServicePageLive key={slug} locale="en" slug={slug} content={content} />
    </SiteChrome>
  );
}
