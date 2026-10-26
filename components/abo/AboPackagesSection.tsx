import type { AboPageContent } from "@/lib/content/abo-page";
import { AboPromoBanner } from "@/components/abo/AboPromoBanner";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import styles from "./AboLandingPage.module.css";

type AboPackagesSectionProps = {
  packages: AboPageContent["packages"];
  promo: AboPageContent["promo"];
};

/**
 * Responsive three-package comparison for Visibility Start / Plus / Individuell.
 * Prices, features and promo copy are Sanity-editable; no invented quantities.
 */
export function AboPackagesSection({
  packages,
  promo,
}: AboPackagesSectionProps) {
  return (
    <section
      className={styles.packages}
      data-header-theme="light"
      aria-labelledby="abo-packages-title"
    >
      <Container>
        <Reveal className={styles.packagesHeader}>
          <SectionLabel>{packages.label}</SectionLabel>
          <h2 id="abo-packages-title" className={styles.sectionHeadline}>
            {packages.headline}
          </h2>
          <p className={styles.packagesIntro}>{packages.introduction}</p>
        </Reveal>

        <div className={styles.packageGrid}>
          {packages.items.map((pkg, index) => (
            <Reveal
              key={pkg.id}
              as="article"
              className={[
                styles.packageCard,
                pkg.highlighted ? styles.packageCardHighlighted : "",
              ]
                .filter(Boolean)
                .join(" ")}
              delayMs={index * 60}
            >
              <div className={styles.packageCardBody}>
                <h3 className={styles.packageName}>{pkg.name}</h3>
                <p className={styles.packagePrice}>
                  <span className={styles.packagePriceValue}>{pkg.price}</span>
                  {pkg.priceSuffix ? (
                    <span className={styles.packagePriceSuffix}>
                      {pkg.priceSuffix}
                    </span>
                  ) : null}
                </p>
                <p className={styles.packageVat}>{packages.vatNote}</p>
                <p className={styles.packageSummary}>{pkg.summary}</p>
                <ul className={styles.packageFeatures}>
                  {pkg.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </div>
              <Button
                href={pkg.cta.href}
                variant={pkg.highlighted ? "cyan" : "outline"}
                fullWidthMobile
                className={styles.packageCta}
              >
                {pkg.cta.label}
              </Button>
            </Reveal>
          ))}
        </div>
        <AboPromoBanner promo={promo} />
      </Container>
    </section>
  );
}
