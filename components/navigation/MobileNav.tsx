"use client";

import { useEffect } from "react";
import type { Dictionary, Locale } from "@/types/i18n";
import { getContactHref, getPrimaryNav } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/Button";
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
  const labels = {
    solutions: dictionary.nav.solutions,
    references: dictionary.nav.references,
    about: dictionary.nav.about,
    contact: dictionary.nav.contact,
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
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
          onClick={onClose}
          aria-label={dictionary.nav.closeMenu}
        >
          ×
        </button>
      </div>

      <nav className={styles.nav} aria-label={dictionary.nav.primaryNav}>
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.id}>
              <NavLink href={item.href} className={styles.link} onClick={onClose}>
                {labels[item.id]}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.bottom}>
        <Button href={getContactHref(locale)} fullWidthMobile onClick={onClose}>
          {dictionary.nav.cta}
        </Button>
      </div>
    </div>
  );
}
