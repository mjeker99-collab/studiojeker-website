import type { ReactNode } from "react";
import type { Locale } from "@/types/i18n";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { DocumentLang } from "@/components/i18n/DocumentLang";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { OrganizationJsonLd } from "@/components/seo/OrganizationJsonLd";

type SiteChromeProps = {
  locale: Locale;
  children: ReactNode;
};

export function SiteChrome({ locale, children }: SiteChromeProps) {
  const dictionary = getDictionary(locale);

  return (
    <>
      <OrganizationJsonLd />
      <DocumentLang locale={locale} />
      <a className="skip-link" href="#main-content">
        {locale === "de" ? "Zum Inhalt springen" : "Skip to content"}
      </a>
      <Header locale={locale} dictionary={dictionary} />
      <main id="main-content" className="site-main">
        {children}
      </main>
      <Footer locale={locale} dictionary={dictionary} />
    </>
  );
}
