#!/usr/bin/env node
/**
 * One-off service-page content migration → Sanity.
 *
 * Creates or patches exactly four service documents (no duplicates).
 * Does NOT touch Homepage, About, Work, Team, Clients or Global Settings.
 * Does NOT change service-page layout/CSS.
 *
 * Requires: SANITY_API_WRITE_TOKEN (never log / print the token).
 *
 * Usage: node scripts/migrate-services-to-sanity.mjs
 */

import { createClient } from "@sanity/client";
import { createReadStream, existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim() || "tgx6e6jg";
const DATASET =
  process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
const API_VERSION =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION?.trim() || "2025-01-01";

const SERVICE_IDS = [
  "service-digital-marketing",
  "service-business-communication",
  "service-product-communication",
  "service-architecture",
];

function requireWriteToken() {
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim();
  if (!token) {
    console.error(
      "SANITY_API_WRITE_TOKEN is not set. Add it to the environment and re-run.",
    );
    process.exit(1);
  }
  return token;
}

function getWriteClient(token) {
  return createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: API_VERSION,
    token,
    useCdn: false,
    perspective: "raw",
  });
}

async function uploadImage(client, cache, relativePath, alt) {
  const cached = cache.get(relativePath);
  if (cached) {
    return { ...cached, alt };
  }

  const absolutePath = resolve(ROOT, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Image not found: ${relativePath}`);
  }

  console.log(`Uploading ${relativePath}`);
  const asset = await client.assets.upload("image", createReadStream(absolutePath), {
    filename: basename(absolutePath),
  });

  const image = {
    _type: "image",
    asset: { _type: "reference", _ref: asset._id },
    alt,
  };
  cache.set(relativePath, image);
  return image;
}

function imageField(client, cache, relativePath, alt) {
  return uploadImage(client, cache, relativePath, alt);
}

const VERIFY_QUERY = `*[_id == $id][0]{
  _id,
  _type,
  internalTitle,
  displayTitle,
  "slug": slug.current,
  heroHeadline,
  heroCtaLabel,
  solutions[]{ title },
  showreelHeadline,
  showreelVideoId,
  projects[]{ title, category },
  aboutHeadline,
  ctaHeadline,
  seoTitle,
  heroImage{ asset->{_id, originalFilename} },
  showreelImage{ asset->{_id, originalFilename} },
  aboutImage{ asset->{_id, originalFilename} }
}`;

async function buildServices(client, cache) {
  const img = (path, alt) => imageField(client, cache, path, alt);

  const digital = {
    _id: "service-digital-marketing",
    _type: "service",
    internalTitle: "Digital & Social Media Marketing",
    displayTitle: "Content & Digital Marketing",
    slug: { _type: "slug", current: "digital-marketing" },
    sortOrder: 10,
    heroLabel: "Content & Digital Marketing",
    heroHeadline: "Aus Aufmerksamkeit wird Wirkung",
    heroHeadlineAccent: ".",
    heroSubheadline: "Kontinuierlicher Content. Kontinuierliche Sichtbarkeit.",
    heroIntroText:
      "Sichtbarkeit braucht Kontinuität. Wir verbinden Strategie, Content-Produktion und Distribution — damit Marken dort präsent bleiben, wo es zählt.",
    heroCtaLabel: "Projekt besprechen",
    heroCtaHref: "/contact",
    heroImage: await img(
      "public/images/Social marketing/Social marketing/Zofingen-0279-b9bf2eb3.jpg",
      "Digitale Content-Produktion von Studiojeker",
    ),
    solutionsLabel: "Unsere Leistungen",
    solutionsHeadline: "Unsere Leistungen",
    solutions: [
      {
        _type: "serviceSolutionItem",
        _key: "strategy",
        itemId: "strategy",
        title: "Content-Strategie",
        description:
          "Klare Positionierung, redaktionelle Planung und Kanalstrategie für nachhaltige Sichtbarkeit.",
        href: "/contact",
        icon: "strategy",
      },
      {
        _type: "serviceSolutionItem",
        _key: "content",
        itemId: "content",
        title: "Content-Produktion",
        description:
          "Fotografie, Video, Reels und Texte — produziert für digitale Kanäle.",
        href: "/work",
        icon: "content",
      },
      {
        _type: "serviceSolutionItem",
        _key: "social",
        itemId: "social",
        title: "Social Media",
        description:
          "Publishing und Präsenz auf LinkedIn, Instagram und weiteren Plattformen.",
        href: "/work",
        icon: "social",
      },
      {
        _type: "serviceSolutionItem",
        _key: "abo",
        itemId: "abo",
        title: "Sichtbarkeit im Abo",
        description:
          "Kontinuierlicher Content. Planbare Kosten. Sichtbarkeit als Prozess — nicht als Einzelprojekt.",
        href: "/solutions/sichtbarkeit-im-abo",
        icon: "abo",
      },
    ],
    showreelLabel: "Showreel",
    showreelHeadline: "Content, der präsent bleibt",
    showreelBody:
      "Von der Idee bis zur Distribution — Inhalte, die Reichweite und Relevanz über die Zeit aufbauen.",
    showreelCtaLabel: "Showreel ansehen",
    showreelCtaHref: "/work",
    showreelImage: await img(
      "public/images/Social marketing/Social marketing/Filmproduktionimg1.jpg",
      "Content-Produktion Showreel",
    ),
    showreelVideoId: "1216349266",
    projectsLabel: "Ausgewählte Projekte",
    projectsHeadline: "Ausgewählte Projekte",
    projectsViewAllLabel: "Alle Projekte ansehen",
    projectsViewAllHref: "/work",
    projects: [
      {
        _type: "serviceProjectItem",
        _key: "dig-1",
        itemId: "dig-1",
        title: "Content & Digital Marketing",
        category: "Content",
        href: "/work",
        isPlaceholder: true,
        image: await img(
          "public/images/Social marketing/Social marketing/PHOTO-2023-05-11-15-00-27.jpg",
          "Content-Marketing-Projektvisual",
        ),
      },
      {
        _type: "serviceProjectItem",
        _key: "dig-2",
        itemId: "dig-2",
        title: "Content & Digital Marketing",
        category: "Social Media",
        href: "/work",
        isPlaceholder: true,
        image: await img(
          "public/images/Social marketing/Social marketing/Eventfotografie-2-a35bdf37.jpg",
          "Social-Media-Projektvisual",
        ),
      },
      {
        _type: "serviceProjectItem",
        _key: "dig-3",
        itemId: "dig-3",
        title: "Content & Digital Marketing",
        category: "Strategie",
        href: "/work",
        isPlaceholder: true,
        image: await img(
          "public/images/Social marketing/Social marketing/Screenshot-2022-11-04-104711-1.png",
          "Digitale-Strategie-Projektvisual",
        ),
      },
      {
        _type: "serviceProjectItem",
        _key: "dig-4",
        itemId: "dig-4",
        title: "Content & Digital Marketing",
        category: "Sichtbarkeit im Abo",
        href: "/solutions/sichtbarkeit-im-abo",
        isPlaceholder: true,
        image: await img(
          "public/images/business/Business_15-c86517b0.jpg",
          "Sichtbarkeit-im-Abo-Visual",
        ),
      },
    ],
    aboutLabel: "Über Studiojeker",
    aboutHeadline: "Strategie. Kreativität. Produktion. Wirkung",
    aboutHeadlineAccent: ".",
    aboutSubheadline: "",
    aboutText:
      "Seit 1992 der Partner für visuelle Kommunikation mit Substanz und Stil. Für Marken, die gesehen werden wollen.",
    aboutCtaLabel: "Mehr über uns",
    aboutCtaHref: "/about",
    aboutImage: await img(
      "public/images/business/Industrie_1-1dfc4e3a.jpg",
      "Studiojeker Content-Team bei der Arbeit",
    ),
    clientsLabel: "Brands, die uns vertrauen",
    ctaHeadline: "Starten Sie Ihre Sichtbarkeit.",
    ctaText:
      "Wir freuen uns darauf, mit Ihnen kontinuierliche Präsenz aufzubauen.",
    ctaLabel: "Kontakt aufnehmen",
    ctaHref: "/contact",
    seoTitle: "Marketingstrategie, Social Media & Content Marketing",
    seoDescription:
      "Marketingstrategien, Social Media, Websites, Newsletter und Content-Marketing für nachhaltige Sichtbarkeit und mehr Reichweite.",
  };

  const business = {
    _id: "service-business-communication",
    _type: "service",
    internalTitle: "Business Communication",
    displayTitle: "Business Communication",
    slug: { _type: "slug", current: "business-communication" },
    sortOrder: 20,
    heroLabel: "Business Communication",
    heroHeadline: "Menschen zeigen. Vertrauen schaffen. Beziehungen stärken.",
    heroHeadlineAccent: "",
    heroSubheadline:
      "Authentische Unternehmenskommunikation für Unternehmen, Organisationen und Marken.",
    heroIntroText:
      "Der erste Eindruck entscheidet oft über den weiteren Verlauf einer Geschäftsbeziehung.\n\nMit professionellen Businessportraits, Unternehmensfilmen, Erklärvideos, Mitarbeiterfotografie und Social Media unterstützen wir Unternehmen dabei, Persönlichkeit zu zeigen, Vertrauen aufzubauen und nachhaltig sichtbar zu werden.",
    heroCtaLabel: "Projekt besprechen",
    heroCtaHref: "/contact",
    heroImage: await img(
      "public/images/business/Business_3-e21f49d5.jpg",
      "Business-Filmproduktion von Studiojeker",
    ),
    solutionsLabel: "Unsere Leistungen",
    solutionsHeadline: "Unsere Leistungen",
    solutions: [
      {
        _type: "serviceSolutionItem",
        _key: "corporate-films",
        itemId: "corporate-films",
        title: "Unternehmensfilme",
        description:
          "Authentische Filme, die Ihr Unternehmen, Ihre Kultur und Ihre Leistungen sichtbar machen.",
        href: "/work",
        icon: "film",
      },
      {
        _type: "serviceSolutionItem",
        _key: "portraits",
        itemId: "portraits",
        title: "Businessporträts",
        description:
          "Professionelle Portraits für Geschäftsleitung, Mitarbeitende und Teams.",
        href: "/work",
        icon: "portrait",
      },
      {
        _type: "serviceSolutionItem",
        _key: "reportage",
        itemId: "reportage",
        title: "Reportagen",
        description:
          "Echte Menschen. Echte Geschichten. Für Website, Recruiting und Employer Branding.",
        href: "/work",
        icon: "reportage",
      },
      {
        _type: "serviceSolutionItem",
        _key: "internal",
        itemId: "internal",
        title: "Social Media",
        description:
          "Kontinuierlicher Content für LinkedIn, Instagram, Facebook und weitere Plattformen.",
        href: "/work",
        icon: "internal",
      },
    ],
    showreelLabel: "Showreel",
    showreelHeadline: "Stories, die bewegen",
    showreelBody:
      "Bewegtbild ist unsere Leidenschaft. Entdecken Sie eine Auswahl unserer Business-Communication-Projekte.",
    showreelCtaLabel: "Showreel ansehen",
    showreelCtaHref: "/work",
    showreelImage: await img(
      "public/images/business/Hamilton_Services3861-1d4705bb.jpg",
      "Behind the scenes einer Studiojeker-Filmproduktion",
    ),
    showreelVideoId: "1216349221",
    projectsLabel: "Ausgewählte Projekte",
    projectsHeadline: "Ausgewählte Projekte",
    projectsViewAllLabel: "Alle Projekte ansehen",
    projectsViewAllHref: "/work",
    projects: [
      {
        _type: "serviceProjectItem",
        _key: "biz-1",
        itemId: "biz-1",
        title: "Business Communication",
        category: "Unternehmensfilm",
        href: "/work",
        isPlaceholder: true,
        image: await img(
          "public/images/business/Business_1-03e4abec.jpg",
          "Business-Communication-Projektvisual",
        ),
      },
      {
        _type: "serviceProjectItem",
        _key: "biz-2",
        itemId: "biz-2",
        title: "Business Communication",
        category: "Businessporträt",
        href: "/work",
        isPlaceholder: true,
        image: await img(
          "public/images/business/Business_4-22cbf9b5.jpg",
          "Businessporträt-Projektvisual",
        ),
      },
      {
        _type: "serviceProjectItem",
        _key: "biz-3",
        itemId: "biz-3",
        title: "Business Communication",
        category: "Reportage",
        href: "/work",
        isPlaceholder: true,
        image: await img(
          "public/images/business/Reportage_21-d196d171.jpg",
          "Reportage-Projektvisual",
        ),
      },
      {
        _type: "serviceProjectItem",
        _key: "biz-4",
        itemId: "biz-4",
        title: "Business Communication",
        category: "Unternehmensfilm",
        href: "/work",
        isPlaceholder: true,
        image: await img(
          "public/images/business/Reportage_9-cb3c2e4c.jpg",
          "Corporate-Storytelling-Projektvisual",
        ),
      },
    ],
    aboutLabel: "Über Studiojeker",
    aboutHeadline: "Strategie. Kreativität. Produktion. Wirkung",
    aboutHeadlineAccent: ".",
    aboutSubheadline: "",
    aboutText:
      "Seit 1992 der Partner für visuelle Kommunikation mit Substanz und Stil. Für Marken, die gesehen werden wollen.",
    aboutCtaLabel: "Mehr über uns",
    aboutCtaHref: "/about",
    aboutImage: await img(
      "public/images/business/Industrie_5-fb0c83d5.jpg",
      "Produktion bei Studiojeker",
    ),
    clientsLabel: "Brands, die uns vertrauen",
    ctaHeadline: "Sichtbarkeit beginnt mit einem Gespräch.",
    ctaText:
      "Gemeinsam entwickeln wir Kommunikationslösungen, die Vertrauen schaffen und Ihre Organisation nachhaltig sichtbar machen.",
    ctaLabel: "Kontakt aufnehmen",
    ctaHref: "/contact",
    seoTitle: "Unternehmensfilme, Businessportraits & Erklärvideos | Studiojeker",
    seoDescription:
      "Businessportraits, Unternehmensfilme, Erklärvideos, Mitarbeiterfotografie und Social Media für Unternehmen, Organisationen und Marken.",
  };

  const product = {
    _id: "service-product-communication",
    _type: "service",
    internalTitle: "Product Communication",
    displayTitle: "Product Communication",
    slug: { _type: "slug", current: "product-communication" },
    sortOrder: 30,
    heroLabel: "Product Communication",
    heroHeadline: "Gute Produkte verdienen eine überzeugende Bühne",
    heroHeadlineAccent: ".",
    heroSubheadline:
      "Wir entwickeln visuelle Kommunikation, die Produkte verständlich macht, Vertrauen schafft und den Verkauf unterstützt.",
    heroIntroText:
      "Ob neues Produkt, komplexe Maschine oder innovative Technologie – wir helfen Ihnen, die Stärken Ihres Produkts sichtbar zu machen.\n\nMit professioneller Produktfotografie, Produktfilmen, 3D-Visualisierungen und Animationen entwickeln wir Inhalte, die begeistern und überzeugen.",
    heroCtaLabel: "Projekt besprechen",
    heroCtaHref: "/contact",
    heroImage: await img(
      "public/images/product/Watch_3-057ab44a.jpg",
      "Produktfotografie von Studiojeker",
    ),
    solutionsLabel: "Unsere Leistungen",
    solutionsHeadline: "Unsere Leistungen",
    solutions: [
      {
        _type: "serviceSolutionItem",
        _key: "photo",
        itemId: "photo",
        title: "Produktfotografie",
        description:
          "Professionelle Bilder für Websites, Kataloge, Onlineshops und Marketingkampagnen.",
        href: "/work",
        icon: "product-photo",
      },
      {
        _type: "serviceSolutionItem",
        _key: "film",
        itemId: "film",
        title: "Produktfilme",
        description:
          "Produkte in Bewegung – emotional, informativ und überzeugend.",
        href: "/work",
        icon: "product-film",
      },
      {
        _type: "serviceSolutionItem",
        _key: "viz3d",
        itemId: "viz3d",
        title: "3D-Visualisierungen",
        description:
          "Perfekt für Produkte, die noch in Entwicklung sind oder sich mit klassischer Fotografie nicht optimal darstellen lassen.",
        href: "/work",
        icon: "viz3d",
      },
      {
        _type: "serviceSolutionItem",
        _key: "animation",
        itemId: "animation",
        title: "3D-Animationen",
        description:
          "Komplexe Funktionen und technische Abläufe verständlich erklärt.",
        href: "/work",
        icon: "animation",
      },
    ],
    showreelLabel: "Showreel",
    showreelHeadline: "Details, die überzeugen",
    showreelBody:
      "Präzision sichtbar machen — Produktgeschichten in Fotografie, Film und 3D.",
    showreelCtaLabel: "Showreel ansehen",
    showreelCtaHref: "/work",
    showreelImage: await img(
      "public/images/product/Industriefilm.jpg",
      "Produktfilm-Produktion",
    ),
    showreelVideoId: "1216349221",
    projectsLabel: "Ausgewählte Projekte",
    projectsHeadline: "Ausgewählte Projekte",
    projectsViewAllLabel: "Alle Projekte ansehen",
    projectsViewAllHref: "/work",
    projects: [
      {
        _type: "serviceProjectItem",
        _key: "prod-1",
        itemId: "prod-1",
        title: "Product Communication",
        category: "Produktfotografie",
        href: "/work",
        isPlaceholder: true,
        image: await img(
          "public/images/product/Produktfotografie-scaled.jpg",
          "Produktfotografie-Projekt",
        ),
      },
      {
        _type: "serviceProjectItem",
        _key: "prod-2",
        itemId: "prod-2",
        title: "Product Communication",
        category: "Produktfilm",
        href: "/work",
        isPlaceholder: true,
        image: await img(
          "public/images/product/certina1.jpg",
          "Produktfilm-Projekt",
        ),
      },
      {
        _type: "serviceProjectItem",
        _key: "prod-3",
        itemId: "prod-3",
        title: "Product Communication",
        category: "3D-Visualisierung",
        href: "/work",
        isPlaceholder: true,
        image: await img(
          "public/images/product/3D-Animation01.jpg",
          "3D-Produktvisualisierung",
        ),
      },
      {
        _type: "serviceProjectItem",
        _key: "prod-4",
        itemId: "prod-4",
        title: "Product Communication",
        category: "Produktfotografie",
        href: "/work",
        isPlaceholder: true,
        image: await img(
          "public/images/product/Uhren_3-c83cc10e.jpg",
          "Produktstillleben",
        ),
      },
    ],
    aboutLabel: "Über Studiojeker",
    aboutHeadline: "Strategie. Kreativität. Produktion. Wirkung",
    aboutHeadlineAccent: ".",
    aboutSubheadline: "",
    aboutText:
      "Seit 1992 der Partner für visuelle Kommunikation mit Substanz und Stil. Für Marken, die gesehen werden wollen.",
    aboutCtaLabel: "Mehr über uns",
    aboutCtaHref: "/about",
    aboutImage: await img(
      "public/images/product/Fotocomposing-725efaf0.jpg",
      "Produktproduktion bei Studiojeker",
    ),
    clientsLabel: "Brands, die uns vertrauen",
    ctaHeadline: "Gemeinsam machen wir Ihr Produkt sichtbar.",
    ctaText:
      "Von der ersten Idee bis zur internationalen Markteinführung begleiten wir Unternehmen mit professioneller Produktkommunikation.",
    ctaLabel: "Kontakt aufnehmen",
    ctaHref: "/contact",
    seoTitle: "Produktfotografie, Produktvideos & 3D Visualisierung | Studiojeker",
    seoDescription:
      "Produktfotografie, Produktvideos, 3D-Visualisierungen und Animationen für Industrie, Technik und innovative Produkte.",
  };

  const architecture = {
    _id: "service-architecture",
    _type: "service",
    internalTitle: "Architecture & Real Estate",
    displayTitle: "Architecture & Real Estate",
    slug: { _type: "slug", current: "architecture" },
    sortOrder: 40,
    heroLabel: "Architecture & Real Estate",
    heroHeadline: "Bevor Architektur entsteht, muss Begeisterung entstehen",
    heroHeadlineAccent: ".",
    heroSubheadline:
      "Visualisierungen, Animationen und digitale Erlebnisse für Architektur- und Immobilienprojekte.",
    heroIntroText:
      "Erfolgreiche Projekte beginnen lange vor dem ersten Spatenstich. Mit fotorealistischen Visualisierungen, 3D-Animationen, virtuellen Rundgängen und Drohnenaufnahmen machen wir Architektur erlebbar – für Wettbewerbe, Investoren, Käufer und Vermarktung.",
    heroCtaLabel: "Projekt besprechen",
    heroCtaHref: "/contact",
    heroImage: await img(
      "public/images/architecture/hero-villa-master.jpg",
      "Architekturvisualisierung von Studiojeker",
    ),
    solutionsLabel: "Unsere Leistungen",
    solutionsHeadline: "Unsere Leistungen",
    solutions: [
      {
        _type: "serviceSolutionItem",
        _key: "viz",
        itemId: "viz",
        title: "Architekturvisualisierungen",
        description:
          "Fotorealistische Bilder für Wettbewerbe, Baueingaben und Vermarktung.",
        href: "/work",
        icon: "architecture",
      },
      {
        _type: "serviceSolutionItem",
        _key: "animation",
        itemId: "animation",
        title: "3D-Animationen",
        description:
          "Beeindruckende Filme, welche Architektur verständlich und emotional präsentieren.",
        href: "/work",
        icon: "animation",
      },
      {
        _type: "serviceSolutionItem",
        _key: "drone",
        itemId: "drone",
        title: "Drohnenaufnahmen",
        description:
          "Professionelle Luftaufnahmen für Architektur, Immobilien und Bauprojekte.",
        href: "/work",
        icon: "drone",
      },
      {
        _type: "serviceSolutionItem",
        _key: "tours",
        itemId: "tours",
        title: "Virtuelle Rundgänge",
        description: "Immobilien digital erleben – jederzeit und überall.",
        href: "/work",
        icon: "tour",
      },
    ],
    showreelLabel: "Showreel",
    showreelHeadline: "Räume, die begeistern",
    showreelBody:
      "Von der ersten Vision bis zur Vermarktung — Architektur sichtbar, bevor sie gebaut wird.",
    showreelCtaLabel: "Showreel ansehen",
    showreelCtaHref: "/work",
    showreelImage: await img(
      "public/images/architecture/Architekturvisualisierung.jpg",
      "Architekturvisualisierung Showreel",
    ),
    showreelVideoId: "1216349245",
    projectsLabel: "Ausgewählte Projekte",
    projectsHeadline: "Ausgewählte Projekte",
    projectsViewAllLabel: "Alle Projekte ansehen",
    projectsViewAllHref: "/work",
    projects: [
      {
        _type: "serviceProjectItem",
        _key: "arch-1",
        itemId: "arch-1",
        title: "Architecture & Real Estate",
        category: "Visualisierung",
        href: "/work",
        isPlaceholder: true,
        image: await img(
          "public/images/architecture/v5_02_korr.jpg",
          "Architektur-Projektvisual",
        ),
      },
      {
        _type: "serviceProjectItem",
        _key: "arch-2",
        itemId: "arch-2",
        title: "Architecture & Real Estate",
        category: "3D-Animation",
        href: "/work",
        isPlaceholder: true,
        image: await img(
          "public/images/architecture/3D_2.jpg",
          "3D-Architektur-Projektvisual",
        ),
      },
      {
        _type: "serviceProjectItem",
        _key: "arch-3",
        itemId: "arch-3",
        title: "Architecture & Real Estate",
        category: "Immobilien",
        href: "/work",
        isPlaceholder: true,
        image: await img(
          "public/images/architecture/troesch4.jpg",
          "Immobilien-Projektvisual",
        ),
      },
      {
        _type: "serviceProjectItem",
        _key: "arch-4",
        itemId: "arch-4",
        title: "Architecture & Real Estate",
        category: "Visualisierung",
        href: "/work",
        isPlaceholder: true,
        image: await img(
          "public/images/architecture/IMG_9915.jpg",
          "Architekturfotografie-Visual",
        ),
      },
    ],
    aboutLabel: "Über Studiojeker",
    aboutHeadline: "Strategie. Kreativität. Produktion. Wirkung",
    aboutHeadlineAccent: ".",
    aboutSubheadline: "",
    aboutText:
      "Seit 1992 der Partner für visuelle Kommunikation mit Substanz und Stil. Für Marken, die gesehen werden wollen.",
    aboutCtaLabel: "Mehr über uns",
    aboutCtaHref: "/about",
    aboutImage: await img(
      "public/images/architecture/v5_02_korr-1.jpg",
      "Architekturproduktion bei Studiojeker",
    ),
    clientsLabel: "Brands, die uns vertrauen",
    ctaHeadline: "Lassen Sie uns über Ihr Projekt sprechen.",
    ctaText:
      "Von der ersten Visualisierung bis zur fertigen Kommunikationskampagne schaffen wir Sichtbarkeit über alle Kanäle hinweg.",
    ctaLabel: "Kontakt aufnehmen",
    ctaHref: "/contact",
    seoTitle: "Architekturvisualisierung, Drohnen & Immobilienmarketing",
    seoDescription:
      "Fotorealistische Architekturvisualisierungen, Animationen, Drohnenaufnahmen und virtuelle Rundgänge für Architektur und Immobilien.",
  };

  return [digital, business, product, architecture];
}

async function upsertService(client, doc) {
  const existing = await client.fetch(`*[_id == $id][0]{_id,_type}`, {
    id: doc._id,
  });

  if (existing?._id) {
    if (existing._type !== "service") {
      throw new Error(
        `Document ${doc._id} exists with unexpected type ${existing._type}. Aborting.`,
      );
    }
    console.log(`Found existing ${doc._id} — patching (no duplicate).`);
    const { _id, _type, ...payload } = doc;
    const result = await client
      .patch(_id)
      .set(payload)
      .commit({ autoGenerateArrayKeys: true });
    console.log(`Patched ${doc._id} revision: ${result._rev}`);
    return;
  }

  console.log(`Creating ${doc._id}.`);
  const created = await client.create(doc);
  console.log(`Created ${created._id} rev ${created._rev}`);
}

async function main() {
  const token = requireWriteToken();
  const client = getWriteClient(token);

  console.log(`Target: project=${PROJECT_ID} dataset=${DATASET}`);

  const extras = await client.fetch(
    `*[_type == "service" && !(_id in $ids)]{_id, displayTitle, "slug": slug.current}`,
    { ids: SERVICE_IDS },
  );
  if (extras.length > 0) {
    throw new Error(
      `Unexpected extra service documents exist (${extras
        .map((d) => d._id)
        .join(", ")}). Aborting to avoid duplicates.`,
    );
  }

  const homepageCount = await client.fetch(`count(*[_type == "homepage"])`);
  const aboutCount = await client.fetch(`count(*[_type == "about"])`);
  const homepageUpdatedAt = await client.fetch(
    `*[_id == "b5bb69d5-b05a-49be-b453-bf9bcd68ecb1"][0]._updatedAt`,
  );
  const aboutUpdatedAt = await client.fetch(`*[_id == "about"][0]._updatedAt`);

  const cache = new Map();
  const services = await buildServices(client, cache);

  for (const doc of services) {
    await upsertService(client, doc);
  }

  for (const expected of services) {
    const verified = await client.fetch(VERIFY_QUERY, { id: expected._id });
    if (!verified?._id) {
      throw new Error(`Read-back failed: ${expected._id} not found.`);
    }
    if (verified._type !== "service") {
      throw new Error(`Unexpected type for ${expected._id}: ${verified._type}`);
    }
    if (verified.slug !== expected.slug.current) {
      throw new Error(
        `Slug mismatch for ${expected._id}: ${verified.slug} !== ${expected.slug.current}`,
      );
    }
    if (verified.heroHeadline !== expected.heroHeadline) {
      throw new Error(`Verification failed for heroHeadline on ${expected._id}.`);
    }
    if (verified.solutions?.length !== 4) {
      throw new Error(`Expected 4 solutions on ${expected._id}.`);
    }
    if (verified.projects?.length !== 4) {
      throw new Error(`Expected 4 projects on ${expected._id}.`);
    }
    if (!verified.heroImage?.asset?._id) {
      throw new Error(`Hero image missing on ${expected._id}.`);
    }
    if (!verified.showreelVideoId) {
      throw new Error(`Showreel video missing on ${expected._id}.`);
    }
    console.log(
      `OK ${verified._id} · ${verified.displayTitle} · /services/${verified.slug}/ · ${verified.heroHeadline}`,
    );
  }

  const serviceCount = await client.fetch(`count(*[_type == "service"])`);
  if (serviceCount !== 4) {
    throw new Error(`Expected 4 service documents, found ${serviceCount}.`);
  }

  const homepageCountAfter = await client.fetch(`count(*[_type == "homepage"])`);
  const aboutCountAfter = await client.fetch(`count(*[_type == "about"])`);
  const homepageUpdatedAfter = await client.fetch(
    `*[_id == "b5bb69d5-b05a-49be-b453-bf9bcd68ecb1"][0]._updatedAt`,
  );
  const aboutUpdatedAfter = await client.fetch(`*[_id == "about"][0]._updatedAt`);

  if (homepageCountAfter !== homepageCount || homepageUpdatedAfter !== homepageUpdatedAt) {
    throw new Error("Homepage document changed during service migration — aborting.");
  }
  if (aboutCountAfter !== aboutCount || aboutUpdatedAfter !== aboutUpdatedAt) {
    throw new Error("About document changed during service migration — aborting.");
  }

  console.log("Verification OK — four service documents written.");
  console.log("Homepage and About were not modified.");
  console.log("Done. Service layout/CSS was not modified.");
}

main().catch((error) => {
  console.error("Service migration failed:", error.message || error);
  process.exit(1);
});
