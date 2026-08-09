import Image from "next/image";
import Link from "next/link";
import type { ContactPageContent } from "@/lib/content/contact";
import { studiojekerContact } from "@/lib/content/contact";
import { mediaPath } from "@/lib/media/paths";
import { ClientsSection } from "@/components/home/ClientsSection";
import { getClientLogos } from "@/lib/content/clients";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { CyanBar } from "@/components/ui/CyanBar";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import styles from "./ContactPage.module.css";

type ContactPageProps = {
  content: ContactPageContent;
  clientsLabel: string;
};

export function ContactPage({ content, clientsLabel }: ContactPageProps) {
  const formHref = `#${content.form.id}`;
  const addressLines = [
    studiojekerContact.company,
    studiojekerContact.street,
    `${studiojekerContact.postalCode} ${studiojekerContact.city}`,
  ];

  return (
    <>
      <section
        className={styles.hero}
        data-header-theme="light"
        aria-labelledby="contact-hero-title"
      >
        <div className={styles.heroGrid}>
          <Reveal className={styles.heroCopy}>
            <SectionLabel>{content.label}</SectionLabel>
            <h1 id="contact-hero-title" className={styles.headline}>
              {content.headlineBefore}
              <span className={styles.accent}>{content.headlineAccent}</span>
              {content.headlineAfter}
            </h1>
            <p className={styles.subheadline}>{content.subheadline}</p>
            <Button href={formHref} variant="outline">
              {content.heroCtaLabel}
            </Button>
          </Reveal>
          <Reveal className={styles.mediaWrap} delayMs={80}>
            <CyanBar />
            <div className={styles.media}>
              <Image
                src={mediaPath(
                  "/images/Social marketing/Social marketing/PHOTO-2023-05-11-15-00-27.jpg",
                )}
                alt="Studiojeker"
                fill
                sizes="(max-width: 1024px) 100vw, 64vw"
                className={styles.image}
                priority
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section
        className={styles.main}
        data-header-theme="light"
        aria-labelledby="contact-form-title"
      >
        <Container>
          <div className={styles.mainGrid}>
            <Reveal className={styles.details}>
              <h2 id="contact-form-title" className="visually-hidden">
                {content.label}
              </h2>
              <ul className={styles.detailList}>
                <li>
                  <span className={styles.detailLabel}>
                    {content.details.addressLabel}
                  </span>
                  <a
                    href={studiojekerContact.mapsHref}
                    className={styles.detailLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {addressLines.map((line) => (
                      <span key={line} className={styles.addressLine}>
                        {line}
                      </span>
                    ))}
                  </a>
                </li>
                <li>
                  <span className={styles.detailLabel}>
                    {content.details.phoneLabel}
                  </span>
                  <a
                    href={`tel:${studiojekerContact.phoneTel}`}
                    className={styles.detailLink}
                  >
                    {studiojekerContact.phoneDisplay}
                  </a>
                </li>
                <li>
                  <span className={styles.detailLabel}>
                    {content.details.emailLabel}
                  </span>
                  <a
                    href={`mailto:${studiojekerContact.email}`}
                    className={styles.detailLink}
                  >
                    {studiojekerContact.email}
                  </a>
                </li>
              </ul>
            </Reveal>

            <Reveal className={styles.formWrap} delayMs={60}>
              <form
                id={content.form.id}
                className={styles.form}
                action={`mailto:${studiojekerContact.email}`}
                method="post"
                encType="text/plain"
              >
                <label className={styles.field}>
                  <span className="visually-hidden">{content.form.name}</span>
                  <input
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder={content.form.name}
                  />
                </label>
                <label className={styles.field}>
                  <span className="visually-hidden">{content.form.company}</span>
                  <input
                    name="company"
                    type="text"
                    autoComplete="organization"
                    placeholder={content.form.company}
                  />
                </label>
                <label className={styles.field}>
                  <span className="visually-hidden">{content.form.email}</span>
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder={content.form.email}
                  />
                </label>
                <label className={styles.field}>
                  <span className="visually-hidden">{content.form.phone}</span>
                  <input
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder={content.form.phone}
                  />
                </label>
                <label className={styles.field}>
                  <span className="visually-hidden">{content.form.message}</span>
                  <textarea
                    name="message"
                    required
                    rows={5}
                    placeholder={content.form.message}
                  />
                </label>
                <p className={styles.privacy}>
                  {content.form.privacyNote}{" "}
                  <Link href={content.privacyHref}>
                    {content.form.privacyLinkLabel}
                  </Link>
                  .
                </p>
                <Button type="submit" variant="primary" showArrow>
                  {content.form.submit}
                </Button>
              </form>
            </Reveal>
          </div>
        </Container>
      </section>

      <section
        className={styles.secondary}
        data-header-theme="dark"
        aria-labelledby="contact-secondary-title"
      >
        <Container>
          <Reveal className={styles.secondaryInner}>
            <SectionLabel inverse>{content.secondary.label}</SectionLabel>
            <h2 id="contact-secondary-title" className={styles.secondaryHeadline}>
              {content.secondary.headline}
            </h2>
            <p className={styles.secondaryText}>{content.secondary.text}</p>
            <Button href={formHref} variant="cyan">
              {content.secondary.ctaLabel}
            </Button>
          </Reveal>
        </Container>
      </section>

      <ClientsSection
        content={{ label: clientsLabel, logos: getClientLogos() }}
      />

      <section
        className={styles.finalCta}
        data-header-theme="dark"
        aria-labelledby="contact-final-cta-title"
      >
        <Reveal className={styles.finalInner}>
          <div className={styles.finalContent}>
            <div className={styles.finalCopy}>
              <h2 id="contact-final-cta-title" className={styles.finalHeadline}>
                {content.finalCta.headlineBefore}
                <span className={styles.accent}>
                  {content.finalCta.headlineAccent}
                </span>
                {content.finalCta.headlineAfter}
              </h2>
              <p className={styles.finalText}>{content.finalCta.text}</p>
            </div>
            <Button href={formHref} variant="secondary">
              {content.finalCta.ctaLabel}
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}
