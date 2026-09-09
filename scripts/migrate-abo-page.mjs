/**
 * Seed the Content-Abo singleton (`_id: abo`) once.
 *
 * Does NOT overwrite existing Studio edits (create-only when the document
 * already exists). Does NOT mutate the Homepage document.
 *
 * Usage: node scripts/migrate-abo-page.mjs
 */
import { createReadStream, existsSync } from "node:fs";
import { basename } from "node:path";
import { createClient } from "@sanity/client";
import { randomUUID } from "node:crypto";

const projectId = "tgx6e6jg";
const dataset = "production";
const apiVersion = "2025-01-01";
const ABO_ID = "abo";

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

function locString(de, en) {
  return { _type: "localizedString", de, en };
}

function locText(de, en) {
  return { _type: "localizedText", de, en };
}

function key() {
  return randomUUID().replace(/-/g, "").slice(0, 12);
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
  const existing = await client.getDocument(ABO_ID).catch(() => null);
  if (existing) {
    console.log(
      `Content-Abo singleton ${ABO_ID} already exists (_updatedAt=${existing._updatedAt}). Skipping seed to preserve Studio edits.`,
    );
    return;
  }

  let imageRef;
  const asset = await uploadImage(HERO_IMAGE);
  imageRef = asset._id;
  console.log(`Uploaded media image → ${imageRef}`);

  const mediaField = {
    _type: "mediaField",
    mediaType: "image",
    image: {
      _type: "image",
      asset: { _type: "reference", _ref: imageRef },
      alt: "Studiojeker Content-Produktion",
    },
  };

  const showreelMedia = {
    _type: "mediaField",
    mediaType: "video",
    vimeoUrl: "https://vimeo.com/1216347773",
    poster: {
      _type: "image",
      asset: { _type: "reference", _ref: imageRef },
      alt: "Studiojeker Showreel",
    },
  };

  const doc = {
    _id: ABO_ID,
    _type: "abo",
    heroSection: {
      label: locString("Sichtbarkeit im Abo", "Visibility subscription"),
      headline: locString(
        "Regelmässig sichtbar. Ohne ständig daran denken zu müssen.",
        "Regularly visible. Without constantly thinking about it.",
      ),
      text: locText(
        "Wir produzieren laufend die Inhalte, die Ihr Unternehmen braucht – für Website, Social Media und digitale Kommunikation. Planbar, professionell und aus einer Hand.",
        "We continuously produce the content your business needs — for website, social media and digital communication. Predictable, professional and from one partner.",
      ),
      cta: {
        _type: "ctaField",
        label: locString("Content-Abo anfragen", "Request content subscription"),
        href: "/contact",
      },
      media: mediaField,
    },
    problemSection: {
      label: locString(
        "Guter Content braucht Kontinuität",
        "Good content needs continuity",
      ),
      headline: locString(
        "Sichtbarkeit entsteht nicht einmal. Sondern immer wieder.",
        "Visibility is not created once. It is created again and again.",
      ),
      text: locText(
        "Viele Unternehmen wissen, dass sie regelmässig kommunizieren sollten. Im Alltag fehlen aber Zeit, Ressourcen oder die passenden Inhalte.\n\nMit dem Studiojeker Content-Abo wird daraus ein planbarer Prozess: Wir entwickeln, produzieren und liefern kontinuierlich neuen Content.",
        "Many businesses know they should communicate regularly. In day-to-day work, time, resources or the right content are missing.\n\nWith the Studiojeker content subscription this becomes a predictable process: we develop, produce and deliver new content continuously.",
      ),
      highlight: locText(
        "Keine Einzelaktionen. Kein ständiges Neu-Briefing. Sondern ein System.",
        "No one-off actions. No constant re-briefing. A system.",
      ),
    },
    benefitsSection: {
      items: [
        {
          _key: key(),
          _type: "homepageBenefitItem",
          id: "continuous",
          title: locString("Kontinuierlicher Content", "Continuous content"),
          description: locText(
            "Regelmässig neue Fotos, Videos, Reels, Grafiken und weitere Inhalte.",
            "Regular new photos, videos, reels, graphics and further assets.",
          ),
          sortOrder: 1,
        },
        {
          _key: key(),
          _type: "homepageBenefitItem",
          id: "system",
          title: locString("Ein System", "One system"),
          description: locText(
            "Planung, Produktion und Umsetzung greifen ineinander.",
            "Planning, production and delivery work together.",
          ),
          sortOrder: 2,
        },
        {
          _key: key(),
          _type: "homepageBenefitItem",
          id: "visibility",
          title: locString("Mehr Sichtbarkeit", "More visibility"),
          description: locText(
            "Kontinuierliche Präsenz auf den relevanten digitalen Kanälen.",
            "Continuous presence on the relevant digital channels.",
          ),
          sortOrder: 3,
        },
        {
          _key: key(),
          _type: "homepageBenefitItem",
          id: "planning",
          title: locString("Planbare Kosten", "Predictable costs"),
          description: locText(
            "Ein definiertes monatliches Budget statt ständig neuer Einzelofferten.",
            "A defined monthly budget instead of constant one-off quotes.",
          ),
          sortOrder: 4,
        },
      ],
    },
    processSection: {
      headline: locString(
        "Von der Planung bis zum fertigen Content.",
        "From planning to finished content.",
      ),
      steps: [
        {
          _key: key(),
          _type: "aboProcessStep",
          id: "plan",
          number: "01",
          title: locString("Planen", "Plan"),
          description: locText(
            "Gemeinsam definieren wir Themen, Ziele, Kanäle und den benötigten Content.",
            "Together we define topics, goals, channels and the content you need.",
          ),
        },
        {
          _key: key(),
          _type: "aboProcessStep",
          id: "produce",
          number: "02",
          title: locString("Produzieren", "Produce"),
          description: locText(
            "Foto, Video, Reels, Animation, Grafik und Text entstehen bei Studiojeker aus einer Hand.",
            "Photo, video, reels, animation, graphics and copy are created at Studiojeker from one partner.",
          ),
        },
        {
          _key: key(),
          _type: "aboProcessStep",
          id: "publish",
          number: "03",
          title: locString("Ausspielen", "Publish"),
          description: locText(
            "Die Inhalte werden für Website, LinkedIn, Instagram, Facebook und weitere Kanäle aufbereitet.",
            "Content is prepared for website, LinkedIn, Instagram, Facebook and further channels.",
          ),
        },
        {
          _key: key(),
          _type: "aboProcessStep",
          id: "develop",
          number: "04",
          title: locString("Weiterentwickeln", "Develop further"),
          description: locText(
            "Wir analysieren, planen weiter und sorgen dafür, dass die Kommunikation nicht wieder einschläft.",
            "We analyse, plan ahead and keep communication from going quiet again.",
          ),
        },
      ],
    },
    scopeSection: {
      headline: locString(
        "So individuell wie Ihr Unternehmen.",
        "As individual as your business.",
      ),
      introduction: locText(
        "Je nach Bedarf kombinieren wir:",
        "Depending on need, we combine:",
      ),
      items: [
        ["Fotografie", "Photography"],
        ["Video", "Video"],
        ["Reels", "Reels"],
        ["Interviews", "Interviews"],
        ["Businessportraits", "Business portraits"],
        ["Produktcontent", "Product content"],
        ["Animation & Motion Graphics", "Animation & motion graphics"],
        ["Grafik", "Graphics"],
        ["Text", "Copy"],
        ["Social-Media-Content", "Social media content"],
        ["Redaktionsplanung", "Editorial planning"],
        ["Publishing", "Publishing"],
      ].map(([de, en]) => ({
        _key: key(),
        _type: "aboScopeItem",
        label: locString(de, en),
      })),
      closing: locText(
        "Das Abo wird entsprechend Kommunikationsbedarf, Frequenz und Produktionsumfang zusammengestellt.",
        "The subscription is assembled according to communication need, frequency and production scope.",
      ),
      highlight: locText(
        "Ein fixes monatliches Budget. Ein klar definierter Leistungsumfang.",
        "A fixed monthly budget. A clearly defined scope of work.",
      ),
    },
    showreelSection: {
      label: locString("Showreel", "Showreel"),
      headline: locString(
        "Ein Partner. Alle Disziplinen",
        "One partner. All disciplines",
      ),
      text: locText(
        "Strategie, Kreation und Produktion unter einem Dach. Das reduziert Schnittstellen und sorgt für einen konsistenten Auftritt.",
        "Strategy, creation and production under one roof. That reduces handovers and keeps the brand appearance consistent.",
      ),
      cta: {
        _type: "ctaField",
        label: locString("Content-Abo anfragen", "Request content subscription"),
        href: "/contact",
      },
      media: showreelMedia,
    },
    closingSection: {
      label: locString(
        "Bereit für mehr Sichtbarkeit?",
        "Ready for more visibility?",
      ),
      headline: locString(
        "Machen wir Content planbar.",
        "Let's make content predictable.",
      ),
      text: locText(
        "Wir zeigen Ihnen gerne, wie ein Content-Abo für Ihr Unternehmen aussehen könnte.",
        "We are happy to show you what a content subscription could look like for your business.",
      ),
      cta: {
        _type: "ctaField",
        label: locString(
          "Unverbindliches Gespräch",
          "Non-binding conversation",
        ),
        href: "/contact",
      },
    },
    seoSection: {
      title: locString(
        "Sichtbarkeit im Abo | Studiojeker",
        "Visibility Subscription | Studiojeker",
      ),
      description: locText(
        "Kontinuierlicher Content für Website, Social Media und digitale Kommunikation — planbar produziert von Studiojeker.",
        "Continuous content for website, social media and digital communication — planned, produced and delivered by Studiojeker.",
      ),
    },
  };

  await client.createOrReplace(doc);
  console.log(`Created Content-Abo singleton ${ABO_ID}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
