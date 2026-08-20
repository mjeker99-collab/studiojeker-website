import type { Locale } from "@/types/i18n";
import type { HomepageContent } from "@/types/homepage";
import { getHomepageContent } from "@/lib/content/homepage";
import { HomePageLive } from "@/components/home/HomePageLive";

type HomePageProps = {
  locale: Locale;
  /**
   * Pre-resolved content (e.g. from Sanity at build time). Falls back to the
   * local content source when omitted, so locales not yet wired to the CMS
   * render exactly as before.
   */
  content?: HomepageContent;
};

export function HomePage({ locale, content }: HomePageProps) {
  const resolvedContent = content ?? getHomepageContent(locale);

  return (
    <HomePageLive key={locale} locale={locale} content={resolvedContent} />
  );
}
