"use client";

import { useEffect, useState } from "react";
import type { Dictionary, Locale } from "@/types/i18n";
import { getPrimaryNav, getServiceNavLinks } from "@/lib/i18n/navigation";
import { LanguageSwitcher } from "@/components/navigation/LanguageSwitcher";
import { NavLink } from "@/components/navigation/NavLink";
import styles from "./MobileNav.module.css";

type MobileNavProps = {
  locale: Locale;
  dictionary: Dictionary;
  open: boolean;
  onClose: () => void;
};

export function MobileNav({ locale, dictionary, open, onClose }: MobileNavProps) {
  const items = getPrimaryNav(locale);
  const serviceLinks = getServiceNavLinks(locale, dictionary);
  const [servicesOpen, setServicesOpen] = useState(false);
  const labels = {
    about: dictionary.nav.about,
    services: dictionary.nav.services,
    work: dictionary.nav.work,
    insights: dictionary.nav.insights,
    contact: dictionary.nav.contact,
  };

  const handleClose = () => {
    setServicesOpen(false);
    onClose();
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setServicesOpen(false);
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <div
      className={styles.overlay}
      hidden={!open}
      role="dialog"
      aria-modal="true"
      aria-label={dictionary.nav.primaryNav}
    >
      <div className={styles.top}>
        <LanguageSwitcher
          locale={locale}
          label={dictionary.nav.language}
          inverse
        />
        <button
          type="button"
          className={styles.close}
          onClick={handleClose}
          aria-label={dictionary.nav.closeMenu}
        >
          ×
        </button>
      </div>

      <nav className={styles.nav} aria-label={dictionary.nav.primaryNav}>
        <ul className={styles.list}>
          {items.map((item) => {
            if (item.id === "services") {
              return (
                <li key={item.id} className={styles.servicesItem}>
                  <button
                    type="button"
                    className={styles.linkButton}
                    aria-expanded={servicesOpen}
                    aria-controls="mobile-services-submenu"
                    onClick={() => setServicesOpen((value) => !value)}
                  >
                    <span>{labels.services}</span>
                    <span className={styles.chevron} aria-hidden="true">
                      {servicesOpen ? "−" : "+"}
                    </span>
                  </button>
                  <ul
                    id="mobile-services-submenu"
                    className={styles.submenu}
                    hidden={!servicesOpen}
                  >
                    {serviceLinks.map((service) => (
                      <li key={service.id}>
                        <NavLink
                          href={service.href}
                          className={styles.sublink}
                          onClick={handleClose}
                        >
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
                <NavLink href={item.href} className={styles.link} onClick={handleClose}>
                  {labels[item.id]}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
