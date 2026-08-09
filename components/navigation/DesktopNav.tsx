"use client";

import { usePathname } from "next/navigation";
import type { Dictionary, Locale } from "@/types/i18n";
import { getPrimaryNav, getServiceNavLinks } from "@/lib/i18n/navigation";
import { NavLink } from "@/components/navigation/NavLink";
import styles from "./DesktopNav.module.css";

type DesktopNavProps = {
  locale: Locale;
  dictionary: Dictionary;
};

function isServicesPath(pathname: string): boolean {
  return (
    pathname === "/services" ||
    pathname.startsWith("/services/") ||
    pathname === "/en/services" ||
    pathname.startsWith("/en/services/")
  );
}

export function DesktopNav({ locale, dictionary }: DesktopNavProps) {
  const pathname = usePathname() || "/";
  const items = getPrimaryNav(locale);
  const serviceLinks = getServiceNavLinks(locale, dictionary);
  const labels = {
    about: dictionary.nav.about,
    services: dictionary.nav.services,
    work: dictionary.nav.work,
    insights: dictionary.nav.insights,
    contact: dictionary.nav.contact,
  };
  const servicesActive = isServicesPath(pathname);

  return (
    <nav aria-label={dictionary.nav.primaryNav}>
      <ul className={styles.list}>
        {items.map((item) => {
          if (item.id === "services") {
            return (
              <li key={item.id} className={styles.menuItem}>
                <button
                  type="button"
                  className={styles.link}
                  aria-haspopup="menu"
                  aria-controls="desktop-services-submenu"
                  aria-current={servicesActive ? "true" : undefined}
                >
                  {labels.services}
                </button>
                <ul
                  id="desktop-services-submenu"
                  className={styles.submenu}
                  role="menu"
                  aria-label={labels.services}
                >
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

          if (!item.href) {
            return null;
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
