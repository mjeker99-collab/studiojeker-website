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

  const content = await getResolvedServiceContent(slug, "de");
  return buildPageMetadata({
    locale: "de",
    pathname: serviceSlugToPath[slug],
    title: content.seo.title,
    description: content.seo.description,
  });
}

export default async function GermanServicePage({ params }: PageProps) {
  const { slug } = await params;
  if (!isServicePageSlug(slug)) {
    notFound();
  }

  const content = await getResolvedServiceContent(slug, "de");

  return (
    <SiteChrome locale="de">
      <ServicePageLive key={slug} locale="de" slug={slug} content={content} />
    </SiteChrome>
  );
}
