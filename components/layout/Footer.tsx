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
          <div className={styles.brandColumn}>
            <h2 className={styles.columnTitle}>{dictionary.footer.brand}</h2>
            <address className={styles.address}>
              {addressLines.map((line) => (
                <span key={line} className={styles.addressLine}>
                  {line}
                </span>
              ))}
            </address>
            <ul className={styles.contactList}>
              <li>
                <a
                  href={`tel:${studiojekerContact.phoneTel}`}
                  className={styles.contactLink}
                >
                  {studiojekerContact.phoneDisplay}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${studiojekerContact.email}`}
                  className={styles.contactLink}
                >
                  {studiojekerContact.email}
                </a>
              </li>
            </ul>
          </div>

          <div className={styles.columns}>
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
              <h2 className={styles.columnTitle}>
                {dictionary.footer.navigation}
              </h2>
              <ul className={styles.list}>
                {items.map((item) => (
                  <li key={item.id}>
                    <TextLink href={item.href} inverse>
                      {labels[item.id as keyof typeof labels]}
                    </TextLink>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <span>{dictionary.footer.copyright}</span>
          <ul className={styles.bottomLegal}>
            {legalLinks.map((item) => (
              <li key={item.href}>
                <TextLink href={item.href} inverse className={styles.bottomLink}>
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
