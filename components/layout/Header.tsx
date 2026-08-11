"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Dictionary, Locale } from "@/types/i18n";
import { localizePathname } from "@/lib/i18n/config";
import { Container } from "@/components/layout/Container";
import { DesktopNav } from "@/components/navigation/DesktopNav";
import { LanguageSwitcher } from "@/components/navigation/LanguageSwitcher";
import { MobileNav } from "@/components/navigation/MobileNav";
import styles from "./Header.module.css";

type HeaderProps = {
  locale: Locale;
  dictionary: Dictionary;
};

type HeaderTheme = "hero" | "light" | "dark";

export function Header({ locale, dictionary }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<HeaderTheme>("hero");

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-header-theme]"),
    );

    if (sections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        const nextTheme = visible?.target.getAttribute("data-header-theme");
        if (nextTheme === "dark" || nextTheme === "light") {
          setTheme(nextTheme);
        }
      },
      {
        rootMargin: "-12% 0px -70% 0px",
        threshold: [0.15, 0.35, 0.6],
      },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const resolvedTheme: HeaderTheme =
    !scrolled && theme === "light" ? "hero" : theme === "dark" ? "dark" : "light";

  const themeClass =
    resolvedTheme === "dark"
      ? styles.themeDark
      : resolvedTheme === "hero"
        ? styles.themeHero
        : styles.themeLight;

  // Always use the claim-free logo.
  // The previous dark-theme PNG contains the "We Create Visibility" claim,
  // which should not appear inside the header logo.
  const logoSrc = "/logos/RZ_Studiojeker_Logo_RGB.svg";

  return (
    <>
      <header
        className={[styles.header, themeClass, scrolled ? styles.scrolled : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <Container className={styles.inner}>
          <Link
            href={localizePathname("/", locale)}
            className={styles.brand}
            aria-label={dictionary.brand.name}
          >
            <Image
              src={logoSrc}
              alt={dictionary.brand.name}
              width={280}
              height={56}
              className={styles.logo}
              priority
            />
          </Link>

          <div className={styles.desktopNav}>
            <DesktopNav locale={locale} dictionary={dictionary} />
          </div>

          <div className={styles.actions}>
            <LanguageSwitcher
              locale={locale}
              label={dictionary.nav.language}
              inverse={resolvedTheme === "dark"}
            />
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
