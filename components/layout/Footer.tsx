import Image from "next/image";
import type { Dictionary, Locale } from "@/types/i18n";
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

  return (
    <footer className={styles.footer}>
      <Container>
        <div className={styles.grid}>
          <div className={styles.brandBlock}>
            <Image
              src="/logos/RZ_Studiojeker_Logo_1992_RGB_neg_8.png"
              alt={dictionary.brand.name}
              width={200}
              height={40}
              className={styles.logo}
            />
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
                <li>
                  <TextLink
                    href={items.find((item) => item.id === "services")?.href ?? "#"}
                    inverse
                  >
                    {dictionary.nav.services}
                  </TextLink>
                </li>
              </ul>
            </div>

            <div>
              <h2 className={styles.columnTitle}>{dictionary.footer.legal}</h2>
              <ul className={styles.list}>
                <li>
                  <span>—</span>
                </li>
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
