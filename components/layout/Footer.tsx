import type { Dictionary, Locale } from "@/types/i18n";
import { studiojekerContact } from "@/lib/content/contact";
import { localizePathname } from "@/lib/i18n/config";
import { getFooterNav, getServiceNavLinks } from "@/lib/i18n/navigation";
import { Container } from "@/components/layout/Container";
import { TextLink } from "@/components/ui/TextLink";
import styles from "./Footer.module.css";

type FooterProps = {
  locale: Locale;
  dictionary: Dictionary;
};

const addressLines = [
  studiojekerContact.company,
  studiojekerContact.street,
  `CH-${studiojekerContact.postalCode} ${studiojekerContact.city}`,
  studiojekerContact.country,
] as const;

export function Footer({ locale, dictionary }: FooterProps) {
  const items = getFooterNav(locale);
  const serviceLinks = getServiceNavLinks(locale, dictionary);
  const labels = {
    about: dictionary.nav.about,
    work: dictionary.nav.work,
    contact: dictionary.nav.contact,
  };

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
          <div className={styles.column}>
            <h2 className={styles.heading}>{dictionary.footer.brand}</h2>
            <div className={styles.columnBody}>
              <address className={styles.content}>
                {addressLines.map((line) => (
                  <span key={line} className={styles.contentLine}>
                    {line}
                  </span>
                ))}
              </address>
              <ul className={styles.contentList}>
                <li>
                  <a
                    href={`tel:${studiojekerContact.phoneTel}`}
                    className={styles.contentLink}
                  >
                    {studiojekerContact.phoneDisplay}
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${studiojekerContact.email}`}
                    className={styles.contentLink}
                  >
                    {studiojekerContact.email}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className={styles.column}>
            <h2 className={styles.heading}>{dictionary.footer.services}</h2>
            <ul className={styles.contentList}>
              {serviceLinks.map((item) => (
                <li key={item.href}>
                  <TextLink
                    href={item.href}
                    inverse
                    className={styles.contentLink}
                  >
                    {item.label}
                  </TextLink>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.column}>
            <h2 className={styles.heading}>{dictionary.footer.navigation}</h2>
            <ul className={styles.contentList}>
              {items.map((item) => (
                <li key={item.id}>
                  <TextLink
                    href={item.href}
                    inverse
                    className={styles.contentLink}
                  >
                    {labels[item.id as keyof typeof labels]}
                  </TextLink>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.meta}>
          <span className={styles.metaText}>{dictionary.footer.copyright}</span>
          <ul className={styles.metaList}>
            {legalLinks.map((item) => (
              <li key={item.href}>
                <TextLink href={item.href} inverse className={styles.metaLink}>
                  {item.label}
                </TextLink>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}
