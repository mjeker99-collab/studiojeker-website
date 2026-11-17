import { test } from "node:test";
import assert from "node:assert/strict";
import { socialBatchPlan } from "../lib/studio/social-batch-plan";

test("Content-Studio: original four-service request becomes 24 posts in three channels", () => {
  const plan = socialBatchPlan(
    "Ich möchte weitere social media posts erstellen lassen zu den 4 servicebereichen, analog zu den bisherigen posts. Wir benötigen pro servicebereich je 6 posts für fFb/Insta und linkedin",
  );
  assert.deepEqual(plan, {
    areaCount: 4,
    postsPerArea: 6,
    totalPosts: 24,
    channels: ["FACEBOOK", "INSTAGRAM", "LINKEDIN"],
  });
});

test("Content-Studio: different explicit channel combinations retain user intent", () => {
  assert.deepEqual(
    socialBatchPlan("Bitte 2 Bereiche mit jeweils 3 Beiträge für LinkedIn vorbereiten."),
    { areaCount: 2, postsPerArea: 3, totalPosts: 6, channels: ["LINKEDIN"] },
  );
});

test("Content-Studio: ambiguous quantities and oversized batches are not invented", () => {
  for (const brief of [
    "Bitte Social Media Posts für unsere Services.",
    "Erstelle vier Bereiche mit Beiträgen für Instagram.",
    "Bitte 4 Servicebereiche mit je 10 Posts für Facebook.",
    "Bitte 9 Servicebereiche mit je 6 Posts für Facebook.",
    "Bitte 4 Servicebereiche mit je 6 Posts ohne Kanäle.",
  ]) assert.equal(socialBatchPlan(brief), null, brief);
});
