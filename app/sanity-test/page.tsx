import type { Metadata } from "next";
import { urlForImage } from "@/lib/sanity/image";
import { fetchHomepageForTest } from "@/lib/sanity/queries";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Sanity connection test",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Isolated Sanity integration test.
 * Does not replace or affect the real Studiojeker homepage.
 */
export default async function SanityTestPage() {
  const doc = await fetchHomepageForTest();

  if (!doc) {
    return (
      <main className={styles.main}>
        <h1 className={styles.title}>SANITY CONNECTION TEST</h1>
        <p className={styles.message}>
          No published Homepage document found in Sanity.
        </p>
      </main>
    );
  }

  const imageUrl = doc.heroImage
    ? urlForImage(doc.heroImage).width(1200).height(800).fit("max").url()
    : null;

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>SANITY CONNECTION TEST</h1>

      <section className={styles.block}>
        <h2 className={styles.label}>Hero Headline:</h2>
        <p className={styles.value}>{doc.heroHeadline || "—"}</p>
      </section>

      <section className={styles.block}>
        <h2 className={styles.label}>Intro Text:</h2>
        <p className={styles.value}>{doc.introText || "—"}</p>
      </section>

      <section className={styles.block}>
        <h2 className={styles.label}>Hero Image:</h2>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- isolated test page; no design system image component
          <img
            src={imageUrl}
            alt={doc.heroHeadline || "Sanity hero image"}
            className={styles.image}
          />
        ) : (
          <p className={styles.value}>No hero image published.</p>
        )}
      </section>
    </main>
  );
}
