import type { Dictionary, Locale } from "@/types/i18n";
import { localizePathname } from "@/lib/i18n/config";
import { getPrimaryNav } from "@/lib/i18n/navigation";
import { Container } from "@/components/layout/Container";
import { TextLink } from "@/components/ui/TextLink";
import styles from "./Footer.module.css";

type FooterProps = {
  locale: Locale;
  dictionary: Dictionary;
};

export function Footer({ locale, dictionary }: FooterProps) {
  const items = getPrimaryNav(locale);
  const labels = {
    about: dictionary.nav.about,
    services: dictionary.nav.services,
    work: dictionary.nav.work,
    insights: dictionary.nav.insights,
    contact: dictionary.nav.contact,
  };

  const serviceLinks = [
    {
      label: dictionary.footer.architecture,
      href: localizePathname("/solutions/architecture-real-estate", locale),
    },
    {
      label: dictionary.footer.productCommunication,
      href: localizePathname("/solutions/products-industry", locale),
    },
    {
      label: dictionary.footer.businessCommunication,
      href: localizePathname("/solutions/brand-business", locale),
    },
    {
      label: dictionary.footer.digitalMarketing,
      href: localizePathname("/solutions/social-digital-marketing", locale),
    },
  ];

  const legalLinks = [
    {
      label: dictionary.footer.impressum,
      href: localizePathname("/impressum", locale),
    },
    {
      label: dictionary.footer.privacy,
      href: localizePathname("/datenschutz", locale),
    },
  ];

  return (
    <footer className={styles.footer}>
      <Container>
        <div className={styles.grid}>
          <div className={styles.brandBlock}>
            <p className={styles.claim}>{dictionary.brand.claim}</p>
            <p className={styles.positioning}>{dictionary.brand.positioning}</p>
          </div>

          <div className={styles.columns}>
            <div>
              <h2 className={styles.columnTitle}>{dictionary.footer.navigation}</h2>
              <ul className={styles.list}>
                {items.map((item) => (
                  <li key={item.id}>
                    <TextLink href={item.href} inverse>
                      {labels[item.id]}
                    </TextLink>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className={styles.columnTitle}>{dictionary.footer.services}</h2>
              <ul className={styles.list}>
                {serviceLinks.map((item) => (
                  <li key={item.href}>
                    <TextLink href={item.href} inverse>
                      {item.label}
                    </TextLink>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className={styles.columnTitle}>{dictionary.footer.legal}</h2>
              <ul className={styles.list}>
                {legalLinks.map((item) => (
                  <li key={item.href}>
                    <TextLink href={item.href} inverse>
                      {item.label}
                    </TextLink>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <span>{dictionary.footer.copyright}</span>
          <span>{dictionary.brand.claim}</span>
        </div>
      </Container>
    </footer>
  );
}
