"use client";

import { usePathname } from "next/navigation";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { localizePathname } from "@/lib/i18n/config";

/**
 * Static-export compatible 404 — locale from pathname (no middleware/headers).
 */
export default function NotFound() {
  const pathname = usePathname() || "/";
  const locale = pathname === "/en" || pathname.startsWith("/en/") ? "en" : "de";
  const homeHref = localizePathname("/", locale);

  return (
    <SiteChrome locale={locale}>
      <section className="foundation-panel">
        <Container>
          <h1 className="headline">404</h1>
          <p className="subheadline prose">
            {locale === "en" ? "Page not found." : "Seite nicht gefunden."}
          </p>
          <Button href={homeHref}>Studiojeker</Button>
        </Container>
      </section>
    </SiteChrome>
  );
}
