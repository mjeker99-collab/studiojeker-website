import { test } from "node:test";
import assert from "node:assert/strict";
import { briefingSchema, generatedPostSchema } from "../lib/studio/input";
import { studioConfig, publicConfig, logoHash } from "../lib/studio/config";
import { objectStore } from "../lib/studio/storage";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const brief = {
  title: "Synthetischer Test",
  topic: "Fotografie",
  offer: "",
  goal: "Sichtbarkeit",
  audience: "KMU",
  tone: "Professionell",
  channels: ["LINKEDIN"],
  count: 1,
  formats: ["1:1"],
  campaignId: null,
  referenceAssetIds: [],
};
test("Studio: ein bis sechs Beiträge, eindeutige Kanäle, sichere Formate", () => {
  assert.equal(briefingSchema.parse({ ...brief, count: 6 }).count, 6);
  for (const count of [0, 7, 1.1])
    assert.throws(() => briefingSchema.parse({ ...brief, count }));
  assert.throws(() =>
    briefingSchema.parse({ ...brief, channels: ["LINKEDIN", "LINKEDIN"] }),
  );
  assert.throws(() => briefingSchema.parse({ ...brief, formats: ["16:9"] }));
  assert.throws(() =>
    briefingSchema.parse({ ...brief, referenceAssetIds: Array(5).fill("x") }),
  );
});
test("Studio: Schweizer Rechtschreibung ohne erfundene Textadapter-Ausgabe", () => {
  assert.equal(
    briefingSchema.parse({ ...brief, topic: "Straße" }).topic,
    "Strasse",
  );
  assert.equal(
    generatedPostSchema.parse({
      imageIdea: "Straße",
      headline: "Grüße",
      hashtags: "",
      variants: [{ channel: "LINKEDIN", text: "Grüße", cta: "" }],
    }).headline,
    "Grüsse",
  );
});
test("Studio: fehlende Schlüssel sind nicht verbunden, kein Secret in öffentlicher Konfiguration", () => {
  const old = process.env.OPENAI_API_KEY,
    flag = process.env.CONTENT_AI_ENABLED;
  try {
    delete process.env.OPENAI_API_KEY;
    process.env.CONTENT_AI_ENABLED = "true";
    assert.equal(studioConfig().connected, false);
    process.env.OPENAI_API_KEY = "test-only-not-a-real-key";
    assert.equal(publicConfig().connected, true);
    assert.ok(
      !JSON.stringify(publicConfig()).includes("test-only-not-a-real-key"),
    );
  } finally {
    if (old === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = old;
    if (flag === undefined) delete process.env.CONTENT_AI_ENABLED;
    else process.env.CONTENT_AI_ENABLED = flag;
  }
});
test("Studio: Original-Logo ist unverändert; keine Ersatzdatei", () => {
  assert.equal(
    logoHash(),
    createHash("sha256")
      .update(readFileSync("../../public/logos/RZ_Studiojeker_Logo_RGB.svg"))
      .digest("hex"),
  );
});
test("Studio: lokaler Bildspeicher ist im Produktionsbetrieb gesperrt", () => {
  const env = process.env as Record<string, string | undefined>,
    old = env.NODE_ENV,
    local = env.STUDIO_LOCAL_ASSETS,
    endpoint = env.STUDIO_S3_ENDPOINT;
  try {
    env.NODE_ENV = "production";
    env.STUDIO_LOCAL_ASSETS = "true";
    delete env.STUDIO_S3_ENDPOINT;
    assert.equal(studioConfig().storage, "DISCONNECTED");
    assert.throws(() => objectStore(), /Nicht verbunden/);
  } finally {
    if (old === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = old;
    if (local === undefined) delete env.STUDIO_LOCAL_ASSETS;
    else env.STUDIO_LOCAL_ASSETS = local;
    if (endpoint !== undefined) env.STUDIO_S3_ENDPOINT = endpoint;
  }
});
