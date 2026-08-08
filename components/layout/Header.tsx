"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Dictionary, Locale } from "@/types/i18n";
import { localizePathname } from "@/lib/i18n/config";
import { getContactHref } from "@/lib/i18n/navigation";
import { Container } from "@/components/layout/Container";
import { DesktopNav } from "@/components/navigation/DesktopNav";
import { LanguageSwitcher } from "@/components/navigation/LanguageSwitcher";
import { MobileNav } from "@/components/navigation/MobileNav";
import { Button } from "@/components/ui/Button";
import styles from "./Header.module.css";

type HeaderProps = {
  locale: Locale;
  dictionary: Dictionary;
};

export function Header({ locale, dictionary }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className={styles.header}>
        <Container className={styles.inner}>
          <Link
            href={localizePathname("/", locale)}
            className={styles.brand}
            aria-label={dictionary.brand.name}
          >
            <Image
              src="/logos/RZ_Studiojeker_Logo_RGB.svg"
              alt={dictionary.brand.name}
              width={180}
              height={34}
              className={styles.logo}
              priority
            />
          </Link>

          <div className={styles.desktopNav}>
            <DesktopNav locale={locale} dictionary={dictionary} />
          </div>

          <div className={styles.actions}>
            <LanguageSwitcher locale={locale} label={dictionary.nav.language} />
            <div className={styles.ctaDesktop}>
              <Button href={getContactHref(locale)} showArrow>
                {dictionary.nav.cta}
              </Button>
            </div>
            <button
              type="button"
              className={styles.menuToggle}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              aria-label={dictionary.nav.openMenu}
              onClick={() => setMenuOpen(true)}
            >
              <span />
            </button>
          </div>
        </Container>
      </header>

      <div id="mobile-navigation">
        <MobileNav
          locale={locale}
          dictionary={dictionary}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
        />
      </div>
    </>
  );
}
