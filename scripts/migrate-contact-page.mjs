/**
 * Create / update the Contact singleton with current staging content.
 * Uploads the Contact hero image and wires Clients / Logos references.
 *
 * Usage: node scripts/migrate-contact-page.mjs
 */
import { createReadStream, existsSync } from "node:fs";
import { basename } from "node:path";
import { createClient } from "@sanity/client";

const projectId = "tgx6e6jg";
const dataset = "production";
const apiVersion = "2025-01-01";
const CONTACT_ID = "contact";

const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_AUTH_TOKEN;
if (!token) {
  console.error("Missing SANITY_API_WRITE_TOKEN or SANITY_AUTH_TOKEN");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: false,
});

const HERO_IMAGE =
  "public/images/Social marketing/Social marketing/PHOTO-2023-05-11-15-00-27.jpg";

const CLIENT_IDS = [
  "client-hirslanden",
  "client-ubs",
  "client-certina",
  "client-bossard",
  "client-endress-hauser",
  "client-raiffeisen",
];

function locString(de, en) {
  return { _type: "localizedString", de, en };
}

function locText(de, en) {
  return { _type: "localizedText", de, en };
}

async function uploadImage(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing image: ${filePath}`);
  }
  return client.assets.upload("image", createReadStream(filePath), {
    filename: basename(filePath),
  });
}

async function main() {
  const existing = await client.getDocument(CONTACT_ID).catch(() => null);
  let imageRef = existing?.heroSection?.media?.image?.asset?._ref;

  if (!imageRef) {
    const asset = await uploadImage(HERO_IMAGE);
    imageRef = asset._id;
    console.log(`Uploaded hero image → ${imageRef}`);
  } else {
    console.log(`Keeping existing hero image ${imageRef}`);
  }

  const doc = {
    _id: CONTACT_ID,
    _type: "contact",
    heroSection: {
      label: locString("Kontakt", "Contact"),
      headline: locString(
        "Lassen Sie uns gemeinsam Sichtbarkeit schaffen.",
        "Let's create visibility together.",
      ),
      subheadline: locText(
        "Wir freuen uns auf Ihr Projekt. Nehmen Sie Kontakt mit uns auf.",
        "Tell us about your project. We look forward to hearing from you.",
      ),
      ctaLabel: locString("Zum Formular", "Go to form"),
      media: {
        _type: "mediaField",
        mediaType: "image",
        image: {
          _type: "image",
          asset: { _type: "reference", _ref: imageRef },
          alt: "Studiojeker",
        },
      },
    },
    detailsSection: {
      addressLabel: locString("Adresse", "Address"),
      phoneLabel: locString("Telefon", "Phone"),
      emailLabel: locString("E-Mail", "Email"),
    },
    secondarySection: {
      label: locString("Lassen Sie uns reden", "Let's talk"),
      headline: locString(
        "Ihr Projekt verdient ein starkes Ergebnis.",
        "Your project deserves a strong result.",
      ),
      text: locText(
        "Ob erstes Kennenlernen oder konkrete Anfrage – wir sind für Sie da.",
        "Whether a first conversation or a concrete brief — we are here.",
      ),
      ctaLabel: locString("Zum Formular", "Go to form"),
    },
    formSection: {
      nameLabel: locString("Ihr Name", "Your name"),
      companyLabel: locString("Firma", "Company"),
      emailLabel: locString("E-Mail", "Email"),
      phoneLabel: locString("Telefon", "Phone"),
      messageLabel: locString("Nachricht", "Message"),
      submitLabel: locString("Nachricht senden", "Send message"),
      privacyNote: locString(
        "Mit dem Absenden akzeptieren Sie unsere",
        "By sending this form you accept our",
      ),
      privacyLinkLabel: locString("Datenschutzerklärung", "privacy policy"),
      successMessage: locString(
        "Vielen Dank. Ihre Nachricht wurde gesendet.",
        "Thank you. Your message has been sent.",
      ),
      errorMessage: locString(
        "Etwas ist schiefgelaufen. Bitte versuchen Sie es später erneut.",
        "Something went wrong. Please try again later.",
      ),
      sendingMessage: locString("Wird gesendet…", "Sending…"),
    },
    clientsSection: {
      label: locString(
        "Brands, die uns vertrauen",
        "Brands that trust us",
      ),
      logos: CLIENT_IDS.map((id, index) => ({
        _type: "reference",
        _ref: id,
        _key: `client-${index}`,
      })),
    },
    finalCtaSection: {
      headline: locString(
        "Lassen Sie uns gemeinsam Sichtbarkeit schaffen.",
        "Let's create visibility together.",
      ),
      text: locText(
        "Wir freuen uns auf Ihr Projekt.",
        "We look forward to your project.",
      ),
      ctaLabel: locString("Zum Formular", "Go to form"),
    },
    seoSection: {
      title: locString(
        "Kontakt Studiojeker | Let's Create Visibility Together",
        "Contact Studiojeker | Let's Create Visibility Together",
      ),
      description: locText(
        "Kontaktieren Sie Studiojeker für Fotografie, Film, 3D-Visualisierung und strategisches Marketing.",
        "Get in touch with Studiojeker to discuss photography, film, 3D visualization and strategic marketing for your business.",
      ),
    },
  };

  // Preserve hero media / logos if editor already customized them.
  if (existing?.heroSection?.media?.image?.asset?._ref) {
    doc.heroSection.media = existing.heroSection.media;
  }
  if (
    Array.isArray(existing?.clientsSection?.logos) &&
    existing.clientsSection.logos.length > 0
  ) {
    doc.clientsSection.logos = existing.clientsSection.logos;
    if (existing.clientsSection.label) {
      doc.clientsSection.label = existing.clientsSection.label;
    }
  }

  await client.createOrReplace(doc);
  console.log(`Upserted Contact singleton ${CONTACT_ID}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
