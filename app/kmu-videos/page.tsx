import { ContactForm } from "@/components/contact/ContactForm";
import { ShowreelSection } from "@/components/home/ShowreelSection";
import styles from "@/components/kmu-videos/KmuVideos.module.css";
import { Container } from "@/components/layout/Container";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { ServiceHero } from "@/components/services/ServiceHero";
import { getContactPageContent } from "@/lib/content/contact";
import { getServicePageContent } from "@/lib/content/services";
import { buildPageMetadata } from "@/lib/seo/metadata";

const business = getServicePageContent("business-communication", "de");
const contact = getContactPageContent("de");

export const metadata = buildPageMetadata({
  locale: "de",
  pathname: "/kmu-videos/",
  title: "Videos für Gewerbe und KMU in Solothurn | Studiojeker",
  description: "Unternehmerfilm mit Social-Media-Kurzfassung für CHF 2’490 oder zwei Reels aus Ihren Aufnahmen für CHF 990. Preise exkl. MWST.",
  ogImagePath: business.hero.media.src,
  omitEnglishAlternate: true,
});

export default function KmuVideosPage() {
  return (
    <SiteChrome locale="de">
      <ServiceHero
        titleId="kmu-videos-hero"
        content={{
          label: "Videos für Gewerbe und KMU",
          headline: "Sie machen gute Arbeit. Wir machen sie sichtbar",
          headlineAccent: ".",
          subheadline: "Ein Unternehmerfilm für Ihre Website und Social Media.",
          body: [
            "Ein kniffliger Auftrag, eine gute Lösung oder ein Handgriff, der Erfahrung braucht. Wir finden mit Ihnen die passende Geschichte, führen Sie durch den Dreh und liefern den fertigen Film.",
          ],
          primaryCta: { label: "Filmidee besprechen", href: "#filmidee" },
          media: business.hero.media,
        }}
      />
      <section className={styles.section} aria-labelledby="kmu-videos-pakete">
        <Container>
          <h2 id="kmu-videos-pakete" className={styles.heading}>Zwei Angebote für Ihren Betrieb</h2>
          <div className={styles.packages}>
            <article className={styles.package}>
              <h3>Unternehmerfilm</h3>
              <p className={styles.price}><strong>CHF 2’490</strong> einmalig, exkl. MWST</p>
              <p>Wir zeigen eine echte Arbeit aus Ihrem Betrieb. Sie erzählen in Ihren eigenen Worten.</p>
              <ul>
                <li>Briefing, Filmidee und Interviewführung</li>
                <li>Bis zu 60 Minuten Dreh an einem Standort mit einer Hauptperson</li>
                <li>Hauptfilm von 60–90 Sekunden in 16:9 und Kurzfassung von 15–30 Sekunden in 9:16</li>
                <li>Anfahrt bis 15 km Fahrstrecke ab Zuchwil. Weitere Distanzen auf Offerte.</li>
              </ul>
            </article>
            <article className={styles.package}>
              <h3>Reel Duo</h3>
              <p className={styles.price}><strong>CHF 990</strong> einmalig, exkl. MWST</p>
              <p>Wir machen aus Ihren vorhandenen Videos und Fotos zwei kurze Filme für Social Media.</p>
              <ul>
                <li>Zwei unterschiedliche Hochformat-Reels von je 15–30 Sekunden</li>
                <li>Bis zu zehn Minuten vorsortiertes Video und 20 Fotos</li>
                <li>Themenabstimmung, Schnitt und Texte im Bild</li>
                <li>Wir prüfen das Material vor der Auftragsbestätigung.</li>
              </ul>
            </article>
          </div>
          <p className={styles.note}>
            Beide Pakete enthalten Titelbilder, Untertitel bei gesprochenem Inhalt, passende
            lizenzierte Musik, zwei Begleittexte und eine gebündelte Korrekturrunde.
            Sie erhalten Full-HD-Dateien zur eigenen Veröffentlichung.
          </p>
          <p className={styles.note}>
            Wir planen die erste Fassung innerhalb von sieben Arbeitstagen ab Dreh oder
            vollständigem Materialeingang. Für die Schlussfassung rechnen wir mit weiteren
            drei Arbeitstagen ab gebündeltem Feedback.
          </p>
        </Container>
      </section>
      <ShowreelSection
        content={{
          ...business.showreel,
          headline: "Filmarbeiten von Studiojeker",
          body: "Ein Einblick in unsere bestehenden Filmproduktionen für Unternehmen.",
          cta: { label: "Weitere Arbeiten ansehen", href: "/work/" },
        }}
      />
      <section className={styles.section} aria-labelledby="kmu-videos-anfrage">
        <Container>
          <div id="filmidee" className={styles.form}>
            <h2 id="kmu-videos-anfrage" className={styles.heading}>Welche Arbeit würden Sie gerne zeigen?</h2>
            <p>Schreiben Sie uns kurz, was Sie beschäftigt. Nora Jeker meldet sich bei Ihnen.</p>
            <ContactForm
              locale="de"
              privacyHref={contact.privacyHref}
              labels={{
                ...contact.form,
                id: "kmu-video-anfrage",
                message: "Ihre Filmidee oder Frage zum Angebot",
                submit: "Anfrage senden",
              }}
            />
          </div>
        </Container>
      </section>
    </SiteChrome>
  );
}
