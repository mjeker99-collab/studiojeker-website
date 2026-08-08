import type { Dictionary, Locale } from "@/types/i18n";
import { getPrimaryNav } from "@/lib/i18n/navigation";
import { NavLink } from "@/components/navigation/NavLink";
import styles from "./DesktopNav.module.css";

type DesktopNavProps = {
  locale: Locale;
  dictionary: Dictionary;
};

export function DesktopNav({ locale, dictionary }: DesktopNavProps) {
  const items = getPrimaryNav(locale);
  const labels = {
    solutions: dictionary.nav.solutions,
    references: dictionary.nav.references,
    about: dictionary.nav.about,
    contact: dictionary.nav.contact,
  };

  return (
    <nav aria-label={dictionary.nav.primaryNav}>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id}>
            <NavLink href={item.href} className={styles.link}>
              {labels[item.id]}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
