import type { Locale } from "@/types/i18n";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getWordpressStatus } from "@/lib/wordpress/client";
import { Container } from "@/components/layout/Container";

type FoundationPageProps = {
  locale: Locale;
};

export function FoundationPage({ locale }: FoundationPageProps) {
  const dictionary = getDictionary(locale);
  const wordpress = getWordpressStatus();

  return (
    <section className="foundation-panel">
      <Container>
        <p className="foundation-meta">
          <span>{dictionary.foundation.statusLabel}</span>
          <span>{dictionary.foundation.localeLabel}</span>
          <span>
            {wordpress.configured
              ? locale === "de"
                ? "WordPress API konfiguriert"
                : "WordPress API configured"
              : locale === "de"
                ? "WordPress API optional"
                : "WordPress API optional"}
          </span>
        </p>

        <h1 className="headline">{dictionary.foundation.title}</h1>
        <p className="subheadline prose">{dictionary.foundation.intro}</p>

        <div className="grid-foundation" aria-label="Foundation">
          {dictionary.foundation.cards.map((card) => (
            <article key={card.title} className="grid-foundation__card">
              <h2>{card.title}</h2>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
