/**
 * Seed the KI/AI singleton (`_id: ai`) once.
 *
 * Does NOT overwrite existing Studio edits (create-only when the document
 * already exists). Does NOT mutate other page documents.
 *
 * Usage: node scripts/migrate-ai-page.mjs
 *
 * Requires a Sanity token with create + write on dataset `production`.
 * Prefer SANITY_API_WRITE_TOKEN. Falls back to SANITY_AUTH_TOKEN only when
 * WRITE is missing or fails a create probe (expired WRITE must not block a
 * working AUTH token that has write rights).
 *
 * Manual alternative (no script):
 * 1. Deploy Studio with the `ai` schema (`studio/` → Sanity).
 * 2. Open desk item "KI / AI" and publish the singleton once
 *    (or create document with ID `ai`, type `ai`).
 */
import { createReadStream, existsSync } from "node:fs";
import { basename } from "node:path";
import { createClient } from "@sanity/client";
import { randomUUID } from "node:crypto";

const projectId = "tgx6e6jg";
const dataset = "production";
const apiVersion = "2025-01-01";
const AI_ID = "ai";
const PROBE_ID = "ai-write-probe";

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

function makeClient(token) {
  return createClient({
    projectId,
    dataset,
    apiVersion,
    token,
    useCdn: false,
  });
}

/**
 * Pick the first env token that can create documents.
 * Tries WRITE first, then AUTH — never lets an expired WRITE shadow a
 * working AUTH without probing.
 */
async function resolveWritableClient() {
  const candidates = [
    ["SANITY_API_WRITE_TOKEN", process.env.SANITY_API_WRITE_TOKEN],
    ["SANITY_AUTH_TOKEN", process.env.SANITY_AUTH_TOKEN],
  ].filter(([, value]) => typeof value === "string" && value.trim());

  if (candidates.length === 0) {
    console.error(
      "Missing SANITY_API_WRITE_TOKEN or SANITY_AUTH_TOKEN.\n" +
        "Provide a Sanity token with create+write on dataset production,\n" +
        "or create the `ai` singleton manually in Studio after deploying the schema.",
    );
    process.exit(1);
  }

  const failures = [];

  for (const [name, token] of candidates) {
    const client = makeClient(token);
    try {
      await client.createIfNotExists({
        _id: PROBE_ID,
        _type: "ai",
        heroSection: {
          label: locString("probe", "probe"),
        },
      });
      await client.delete(PROBE_ID);
      console.log(`Using writable token from ${name}.`);
      return client;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${name}: ${message.split("\n")[0]}`);
      try {
        await client.delete(PROBE_ID);
      } catch {
        // Probe may never have been created.
      }
    }
  }

  console.error(
    "No writable Sanity token available to create `_id: ai`.\n" +
      "Failures:\n- " +
      failures.join("\n- ") +
      "\n\nManual steps:\n" +
      "1. Rotate/create a Sanity API token with Editor (or create+write) on project tgx6e6jg / dataset production.\n" +
      "2. Set SANITY_API_WRITE_TOKEN (do not commit it) and re-run: node scripts/migrate-ai-page.mjs\n" +
      "3. Or deploy Studio with the `ai` schema and publish the “KI / AI” singleton once in the desk.",
  );
  process.exit(1);
}

async function resolveHeroImageRef(client) {
  if (existsSync(HERO_IMAGE)) {
    try {
      const asset = await client.assets.upload(
        "image",
        createReadStream(HERO_IMAGE),
        { filename: basename(HERO_IMAGE) },
      );
      console.log(`Uploaded media image → ${asset._id}`);
      return asset._id;
    } catch (error) {
      console.warn(
        `Image upload failed (${error instanceof Error ? error.message : error}). Reusing an existing Content-Abo hero asset.`,
      );
    }
  }

  const existingRef = await client.fetch(
    `*[_id == "abo"][0].heroSection.media.image.asset._ref`,
  );
  if (typeof existingRef === "string" && existingRef) {
    console.log(`Reusing Content-Abo hero image → ${existingRef}`);
    return existingRef;
  }

  throw new Error("Could not resolve a Sanity image asset for the KI/AI hero.");
}

async function main() {
  const client = await resolveWritableClient();

  const existing = await client.getDocument(AI_ID).catch(() => null);
  if (existing) {
    console.log(
      `KI/AI singleton ${AI_ID} already exists (_updatedAt=${existing._updatedAt}). Skipping seed to preserve Studio edits.`,
    );
    return;
  }

  const imageRef = await resolveHeroImageRef(client);

  const mediaField = {
    _type: "mediaField",
    mediaType: "image",
    image: {
      _type: "image",
      asset: { _type: "reference", _ref: imageRef },
      alt: "Studiojeker visuelle Produktion",
    },
  };

  const applications = [
    {
      id: "concept",
      number: "01",
      title: locString("KONZEPT & IDEENENTWICKLUNG", "CONCEPT & IDEATION"),
      description: locText(
        "KI unterstützt uns bei Recherche, Ideenentwicklung, Varianten und der Ausarbeitung von Kommunikationskonzepten.",
        "AI supports research, idea development, creative variations and the development of communication concepts.",
      ),
    },
    {
      id: "storyboarding",
      number: "02",
      title: locString("STORYBOARDING", "STORYBOARDING"),
      description: locText(
        "Ideen werden früh sichtbar. Mit KI entwickeln wir Storyboards, Visual References, Szenen und Bildwelten bereits vor Produktionsbeginn.",
        "Ideas become visible at an early stage. AI allows us to develop storyboards, visual references, scenes and visual worlds before production begins.",
      ),
    },
    {
      id: "planning",
      number: "03",
      title: locString("PLANUNG & PREPRODUCTION", "PLANNING & PREPRODUCTION"),
      description: locText(
        "KI unterstützt Produktionsplanung, Strukturierung und die Vorbereitung komplexer Foto-, Film- und 3D-Projekte.",
        "AI supports production planning, structuring and the preparation of complex photography, film and 3D projects.",
      ),
    },
    {
      id: "postproduction",
      number: "04",
      title: locString(
        "BILD & VIDEO POSTPRODUCTION",
        "IMAGE & VIDEO POSTPRODUCTION",
      ),
      description: locText(
        "Retusche, Erweiterungen, Anpassungen, Compositing und weitere KI-gestützte Verfahren ergänzen unsere klassischen Postproduction-Workflows.",
        "Retouching, extensions, adaptations, compositing and other AI-assisted techniques complement our established postproduction workflows.",
      ),
    },
    {
      id: "generation",
      number: "05",
      title: locString(
        "BILD- & VIDEOGENERIERUNG",
        "IMAGE & VIDEO GENERATION",
      ),
      description: locText(
        "Wir generieren hochwertige visuelle Inhalte und kombinieren KI-generierte Elemente bei Bedarf mit realer Fotografie, Film oder bestehenden Assets.",
        "We create high-quality visual content and, where appropriate, combine AI-generated elements with real photography, film or existing assets.",
      ),
    },
    {
      id: "visualisation",
      number: "06",
      title: locString(
        "3D VISUALISIERUNG & ANIMATION",
        "3D VISUALISATION & ANIMATION",
      ),
      description: locText(
        "KI erweitert unsere etablierten 3D-Workflows – von Konzept und Materialentwicklung bis zur Optimierung und Weiterverarbeitung von Visualisierungen und Animationen.",
        "AI expands our established 3D workflows – from concept and material development to the optimisation and further processing of visualisations and animations.",
      ),
    },
  ].map((item) => ({
    _type: "aiApplicationItem",
    _key: key(),
    ...item,
  }));

  const doc = {
    _id: AI_ID,
    _type: "ai",
    heroSection: {
      label: locString("KÜNSTLICHE INTELLIGENZ", "ARTIFICIAL INTELLIGENCE"),
      headline: locString(
        "KI. Wenn Erfahrung auf neue Möglichkeiten trifft.",
        "AI. Where experience meets new possibilities.",
      ),
      text: locText(
        "Studiojeker setzt künstliche Intelligenz gezielt dort ein, wo sie kreative Prozesse erweitert, Produktionen effizienter macht und neue visuelle Möglichkeiten eröffnet. Dabei verbinden wir modernste KI-Technologien mit über 30 Jahren Erfahrung in Kommunikation, Fotografie, Film und 3D.",
        "Studiojeker uses artificial intelligence wherever it can expand creative possibilities, make production more efficient and open up new ways of creating visual content. We combine state-of-the-art AI technologies with more than 30 years of experience in communication, photography, film and 3D.",
      ),
      media: mediaField,
    },
    introSection: {
      headline: locString(
        "KI ist für uns ein Werkzeug. Ein verdammt gutes.",
        "AI is a tool. An incredibly powerful one.",
      ),
      text: locText(
        "Künstliche Intelligenz verändert die Möglichkeiten visueller Kommunikation grundlegend. Für Studiojeker ersetzt sie jedoch weder kreative Ideen noch Erfahrung und gestalterisches Know-how.\n\nWir integrieren KI gezielt in unsere bestehenden Workflows – von der ersten Idee bis zum fertigen Bild, Film oder zur 3D-Animation. Entscheidend ist nicht, welche Technologie eingesetzt wird, sondern was am Ende entsteht.\n\nUnser Anspruch bleibt derselbe: maximale Qualität, starke visuelle Kommunikation und eine Produktion, die für unsere Kunden wirtschaftlich sinnvoll ist.",
        "Artificial intelligence is fundamentally changing what is possible in visual communication. At Studiojeker, however, it does not replace creative ideas, experience or professional design expertise.\n\nWe integrate AI into our established workflows – from the first idea to the finished image, film or 3D animation. What matters is not which technology is used, but what we create with it.\n\nOur ambition remains the same: maximum quality, powerful visual communication and production processes that make economic sense for our clients.",
      ),
    },
    applicationsSection: {
      headline: locString("Wo wir KI einsetzen", "Where we use AI"),
      items: applications,
    },
    modelsSection: {
      headline: locString(
        "Die besten Modelle. Das richtige Know-how.",
        "The best models. The right expertise.",
      ),
      text: locText(
        "Die Entwicklung im Bereich künstlicher Intelligenz ist extrem dynamisch. Deshalb legen wir uns nicht auf einzelne Plattformen oder Modelle fest.\n\nStudiojeker arbeitet projektbezogen mit den jeweils leistungsfähigsten verfügbaren KI-Modellen und Technologien. Entscheidend ist, für jede Aufgabe das richtige Werkzeug einzusetzen.\n\nUnsere KI-Spezialisten beschäftigen sich kontinuierlich mit neuen Modellen, Workflows und Produktionsmethoden. So verbessern wir unsere Prozesse laufend und erweitern die Grenzen dessen, was sich mit KI qualitativ sinnvoll realisieren lässt.",
        "Artificial intelligence is evolving at extraordinary speed. That is why we do not commit ourselves to individual platforms or models.\n\nStudiojeker works with the most capable AI models and technologies available for each specific project. The key is choosing the right tool for the task.\n\nOur AI specialists continuously explore new models, workflows and production methods. This allows us to improve our processes and continually push the boundaries of what can be achieved with AI at a professional level.",
      ),
    },
    experienceSection: {
      headline: locString("KI + Erfahrung", "AI + Experience"),
      text: locText(
        "Ein gutes KI-Modell allein produziert noch keine gute Kommunikation.\n\nQualität entsteht durch Ideen, Erfahrung, Art Direction, präzise Prompts, Auswahl, Kontrolle und professionelle Weiterverarbeitung.\n\nGenau hier liegt unsere Stärke: Wir verbinden neue KI-Technologien mit jahrzehntelanger Erfahrung in visueller Kommunikation und professioneller Content-Produktion.",
        "A powerful AI model alone does not create powerful communication.\n\nQuality comes from ideas, experience, art direction, precise prompting, selection, control and professional postproduction.\n\nThis is where our strength lies: combining new AI technologies with decades of experience in visual communication and professional content production.",
      ),
    },
    approachSection: {
      headline: locString(
        "Gezielt. Verantwortungsbewusst. Effizient.",
        "Focused. Responsible. Efficient.",
      ),
      text: locText(
        "Wir setzen KI bewusst und projektbezogen ein. Nicht alles, was technisch möglich ist, ist für jedes Projekt sinnvoll.\n\nUnser Ziel ist deshalb nicht maximaler KI-Einsatz, sondern der optimale Produktionsprozess für die jeweilige Aufgabe.\n\nWo KI bessere Resultate, zusätzliche kreative Möglichkeiten oder eine effizientere Produktion ermöglicht, nutzen wir sie. Wo klassische Fotografie, Filmproduktion, 3D oder menschliche Kreativarbeit die bessere Lösung ist, setzen wir weiterhin darauf.\n\nSo entsteht für unsere Kunden die bestmögliche Kombination aus Qualität, Kreativität und Kosteneffizienz.",
        "We use AI consciously and according to the requirements of each project. Not everything that is technically possible makes sense for every production.\n\nOur goal is therefore not to maximise the use of AI, but to create the best possible production process for each task.\n\nWhere AI delivers better results, additional creative possibilities or greater production efficiency, we use it. Where traditional photography, filmmaking, 3D or human creative work is the better solution, we continue to rely on those methods.\n\nThe result is the best possible combination of quality, creativity and cost efficiency for our clients.",
      ),
    },
    closingSection: {
      headline: locString(
        "Was können wir mit KI für Sie möglich machen?",
        "What can we make possible with AI?",
      ),
      text: locText(
        "Erzählen Sie uns von Ihrer Idee. Wir zeigen Ihnen, welche Kombination aus klassischer Produktion, 3D und KI dafür am meisten Sinn macht.",
        "Tell us about your idea. We will show you which combination of traditional production, 3D and AI makes the most sense.",
      ),
      cta: {
        _type: "ctaField",
        label: locString("PROJEKT BESPRECHEN", "DISCUSS YOUR PROJECT"),
        href: "/contact",
      },
    },
    clientsLabel: locString("Ausgewählte Kunden", "Selected clients"),
    seoSection: {
      title: locString(
        "KI für Bild, Video & 3D | Studiojeker",
        "AI for Image, Video & 3D | Studiojeker",
      ),
      description: locText(
        "Studiojeker verbindet künstliche Intelligenz mit über 30 Jahren Erfahrung in Fotografie, Film, 3D und visueller Kommunikation.",
        "Studiojeker combines artificial intelligence with more than 30 years of experience in photography, film, 3D and visual communication.",
      ),
      ogImage: {
        _type: "image",
        asset: { _type: "reference", _ref: imageRef },
      },
    },
  };

  await client.createOrReplace(doc);
  console.log(`Created KI/AI singleton ${AI_ID}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
