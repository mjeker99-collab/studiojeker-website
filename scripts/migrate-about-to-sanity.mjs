#!/usr/bin/env node
/**
 * One-off About content migration → Sanity.
 *
 * Creates or patches the singleton About document (`about`). No duplicate.
 * Does NOT wire other pages. Does not change About layout/CSS.
 *
 * Requires: SANITY_API_WRITE_TOKEN (never log / print the token).
 *
 * Usage: node scripts/migrate-about-to-sanity.mjs
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

const ABOUT_DOCUMENT_ID = "about";

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

async function uploadImage(client, relativePath, alt) {
  const absolutePath = resolve(ROOT, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Image not found: ${relativePath}`);
  }

  console.log(`Uploading ${relativePath}`);
  const asset = await client.assets.upload("image", createReadStream(absolutePath), {
    filename: basename(absolutePath),
  });

  return {
    _type: "image",
    asset: { _type: "reference", _ref: asset._id },
    alt,
  };
}

const VERIFY_QUERY = `*[_id == $id][0]{
  _id,
  _type,
  heroHeadline,
  heroSubheadline,
  heroIntroText,
  valuesLabel,
  valuesItems[]{ title },
  teamHeadline,
  teamMembers[]{ name, isPlaceholder },
  facts[]{ value, label },
  approachHeadline,
  servicesLabel,
  ctaLabel,
  seoTitle,
  heroImage{ asset->{_id, url, originalFilename} },
  teamFeatureImage{ asset->{_id, originalFilename} },
  approachImage{ asset->{_id, originalFilename} }
}`;

async function main() {
  const token = requireWriteToken();
  const client = getWriteClient(token);

  console.log(
    `Target: project=${PROJECT_ID} dataset=${DATASET} document=${ABOUT_DOCUMENT_ID}`,
  );

  const heroImage = await uploadImage(
    client,
    "public/images/Social marketing/Social marketing/Filmproduktionimg1.jpg",
    "Filmproduktion bei Studiojeker",
  );
  const teamFeatureImage = await uploadImage(
    client,
    "public/images/Social marketing/Social marketing/Eventfotografie-2-a35bdf37.jpg",
    "Produktion bei Studiojeker — Team bei der Arbeit",
  );
  const approachImage = await uploadImage(
    client,
    "public/images/Social marketing/Social marketing/PHOTO-2023-05-11-15-00-27.jpg",
    "Content-Produktion bei Studiojeker",
  );
  const martinPortrait = await uploadImage(
    client,
    "public/images/team/Martin.jpg",
    "Martin Jeker",
  );
  const noraPortrait = await uploadImage(
    client,
    "public/images/team/Nora.jpg",
    "Nora Jeker",
  );

  const payload = {
    heroLabel: "Über Studiojeker",
    heroHeadline: "We create\nvisibility",
    heroSubheadline:
      "Ihr Visibility Partner für Unternehmen, Produkte und Architektur.",
    heroIntroText:
      "Sichtbarkeit entsteht nicht durch Zufall. Sie entsteht, wenn Strategie, hochwertiger Content und die richtige Kommunikation zusammenkommen.\n\nSeit 1992 begleiten wir Unternehmen mit Fotografie, Film, 3D-Visualisierung, Design und Digital Marketing.",
    heroCtaLabel: "Unsere Arbeiten entdecken",
    heroImage,
    valuesLabel: "Unser Anspruch",
    valuesItems: [
      {
        _type: "aboutValueItem",
        _key: "personal",
        title: "Persönlich",
        description:
          "Ein kleines, engagiertes Team. Flexibel, direkt und mit dem Anspruch, jedes Projekt zu etwas Besonderem zu machen.",
      },
      {
        _type: "aboutValueItem",
        _key: "creative",
        title: "Kreativ",
        description:
          "Strategie, hochwertiger Content und moderne Produktion greifen ineinander — als eine Lösung.",
      },
      {
        _type: "aboutValueItem",
        _key: "reliable",
        title: "Zuverlässig",
        description:
          "Langjährige Erfahrung, Schweizer Präzision und ein starkes Partnernetzwerk.",
      },
    ],
    teamLabel: "Unser Team",
    teamHeadline: "Die Menschen hinter der Arbeit.",
    teamIntroduction:
      "Studiojeker arbeitet mit einem fokussierten Team und einem Netzwerk spezialisierter Partner.",
    teamFeatureImage,
    teamMembers: [
      {
        _type: "aboutTeamMember",
        _key: "martin",
        name: "Martin Jeker",
        role: "Geschäftsleitung / Fotograf",
        portrait: martinPortrait,
        isPlaceholder: false,
      },
      {
        _type: "aboutTeamMember",
        _key: "nora",
        name: "Nora Jeker",
        role: "Geschäftsleitung / Digital Marketing / Projektleitungen",
        portrait: noraPortrait,
        isPlaceholder: false,
      },
      {
        _type: "aboutTeamMember",
        _key: "slot-1",
        name: "",
        role: "",
        isPlaceholder: true,
      },
      {
        _type: "aboutTeamMember",
        _key: "slot-2",
        name: "",
        role: "",
        isPlaceholder: true,
      },
    ],
    facts: [
      {
        _type: "aboutFact",
        _key: "since",
        value: "1992",
        label: "Visuelle Kommunikation",
      },
      {
        _type: "aboutFact",
        _key: "disciplines",
        value: "5 Disziplinen",
        label: "Fotografie · Film · 3D · Design · Marketing",
      },
      {
        _type: "aboutFact",
        _key: "network",
        value: "Partnernetzwerk",
        label: "Spezialist:innen für grössere und spezifische Produktionen.",
      },
      {
        _type: "aboutFact",
        _key: "partner",
        value: "1 Ansprechpartner",
        label: "Von Strategie bis Umsetzung",
      },
    ],
    approachLabel: "Unsere Arbeitsweise",
    approachHeadline: "Strategie. Kreativität. Produktion. Wirkung",
    approachSubheadline: "Persönlich. Kreativ. Zuverlässig.",
    approachText:
      "Studiojeker verbindet langjährige Erfahrung mit modernster Technologie und einem starken Partnernetzwerk.\n\nVon der ersten Idee bis zur erfolgreichen Umsetzung — ein Ansprechpartner, ein Workflow, ein Ziel: Sichtbarkeit mit Wirkung.",
    approachCtaLabel: "Jetzt Kontakt aufnehmen",
    approachImage,
    servicesLabel: "Wobei wir unterstützen",
    servicesHeadline: "Vier Schwerpunkte. Ein Partner.",
    servicesItems: [
      {
        _type: "aboutServiceItem",
        _key: "digital",
        title: "Content & Digital Marketing",
        description:
          "Content und Kampagnen, die Präsenz mit Klarheit und Kontinuität aufbauen.",
      },
      {
        _type: "aboutServiceItem",
        _key: "business",
        title: "Business Communication",
        description:
          "Authentische Kommunikation für Unternehmen, Organisationen und Marken.",
      },
      {
        _type: "aboutServiceItem",
        _key: "product",
        title: "Product Communication",
        description:
          "Fotografie, Film und 3D, die Produkte erklären und den Vertrieb unterstützen.",
      },
      {
        _type: "aboutServiceItem",
        _key: "architecture",
        title: "Architecture & Real Estate",
        description:
          "Fotorealistische Visualisierungen, Animationen und immersive Erlebnisse für Architektur und Immobilien.",
      },
    ],
    clientsLabel: "Brands, die uns vertrauen",
    ctaHeadline: "Lassen Sie uns gemeinsam Sichtbarkeit schaffen.",
    ctaText: "Wir freuen uns auf Ihr Projekt.",
    ctaLabel: "Jetzt Kontakt aufnehmen",
    seoTitle: "Über Studiojeker | Visibility Partner seit 1992",
    seoDescription:
      "Studiojeker ist Visibility Partner für Unternehmen — mit Fotografie, Film, 3D, Design und Digital Marketing seit 1992.",
  };

  const existing = await client.fetch(`*[_id == $id][0]{_id,_type}`, {
    id: ABOUT_DOCUMENT_ID,
  });

  if (existing?._id) {
    console.log(`Found existing About document: ${existing._id} — patching (no duplicate).`);
    const result = await client
      .patch(ABOUT_DOCUMENT_ID)
      .set(payload)
      .commit({ autoGenerateArrayKeys: true });
    console.log(`Patched About revision: ${result._rev}`);
  } else {
    const duplicates = await client.fetch(`*[_type == "about" && _id != $id]{_id}`, {
      id: ABOUT_DOCUMENT_ID,
    });
    if (duplicates.length > 0) {
      throw new Error(
        `Other About documents already exist (${duplicates.map((d) => d._id).join(", ")}). Aborting to avoid duplicates.`,
      );
    }

    console.log("No About document yet — creating singleton `about`.");
    const created = await client.create({
      _id: ABOUT_DOCUMENT_ID,
      _type: "about",
      ...payload,
    });
    console.log(`Created About document: ${created._id} rev ${created._rev}`);
  }

  const verified = await client.fetch(VERIFY_QUERY, { id: ABOUT_DOCUMENT_ID });
  if (!verified?._id) {
    throw new Error("Read-back failed: About document not found after write.");
  }
  if (verified._type !== "about") {
    throw new Error(`Unexpected type ${verified._type}`);
  }
  if (verified.heroHeadline !== payload.heroHeadline) {
    throw new Error("Verification failed for heroHeadline.");
  }
  if (verified.valuesLabel !== "Unser Anspruch") {
    throw new Error("Verification failed for valuesLabel.");
  }
  if (verified.facts?.length !== 4) {
    throw new Error("Verification failed for facts count.");
  }
  if (verified.teamMembers?.length !== 4) {
    throw new Error("Verification failed for teamMembers count.");
  }
  if (!verified.heroImage?.asset?.url) {
    throw new Error("Verification failed: hero image missing.");
  }

  const aboutCount = await client.fetch(`count(*[_type == "about"])`);
  if (aboutCount !== 1) {
    throw new Error(`Expected 1 About document, found ${aboutCount}.`);
  }

  console.log("Verification OK — About singleton written:");
  console.log(`  - _id: ${verified._id}`);
  console.log(`  - heroHeadline: ${JSON.stringify(verified.heroHeadline)}`);
  console.log(`  - valuesLabel: ${verified.valuesLabel}`);
  console.log(`  - teamHeadline: ${verified.teamHeadline}`);
  console.log(`  - facts: ${verified.facts.map((f) => f.value).join(" · ")}`);
  console.log(`  - heroImage: ${verified.heroImage.asset.originalFilename}`);
  console.log(`  - teamFeatureImage: ${verified.teamFeatureImage?.asset?.originalFilename}`);
  console.log(`  - approachImage: ${verified.approachImage?.asset?.originalFilename}`);
  console.log("Done. About layout/CSS was not modified.");
}

main().catch((error) => {
  console.error("About migration failed:", error.message || error);
  process.exit(1);
});
