"use client";

import type { Dictionary, Locale } from "@/types/i18n";
import { getPrimaryNav, getServiceNavLinks } from "@/lib/i18n/navigation";
import { NavLink } from "@/components/navigation/NavLink";
import styles from "./DesktopNav.module.css";

type DesktopNavProps = {
  locale: Locale;
  dictionary: Dictionary;
};

export function DesktopNav({ locale, dictionary }: DesktopNavProps) {
  const items = getPrimaryNav(locale);
  const serviceLinks = getServiceNavLinks(locale, dictionary);
  const labels = {
    about: dictionary.nav.about,
    services: dictionary.nav.services,
    work: dictionary.nav.work,
    insights: dictionary.nav.insights,
    contact: dictionary.nav.contact,
  };

  return (
    <nav aria-label={dictionary.nav.primaryNav}>
      <ul className={styles.list}>
        {items.map((item) => {
          if (item.id === "services") {
            return (
              <li key={item.id} className={styles.menuItem}>
                <NavLink
                  href={item.href}
                  className={styles.link}
                  matchPrefix="/services"
                >
                  {labels.services}
                </NavLink>
                <ul className={styles.submenu} aria-label={labels.services}>
                  {serviceLinks.map((service) => (
                    <li key={service.id}>
                      <NavLink href={service.href} className={styles.sublink}>
                        {service.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
            );
          }

          return (
            <li key={item.id}>
              <NavLink href={item.href} className={styles.link}>
                {labels[item.id]}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
