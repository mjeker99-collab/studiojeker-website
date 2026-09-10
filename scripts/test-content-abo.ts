/** Deterministic regression checks: npx tsx scripts/test-content-abo.ts */
import assert from "node:assert/strict";
import { getAboPageContent } from "../lib/content/abo-page";
import { mergeSanityAbo } from "../lib/content/merge-sanity-abo";
import { createAboRefresh } from "../lib/content/abo-refresh";
import type { SanityAbo } from "../lib/sanity/abo";

const base = getAboPageContent("de");
const original = structuredClone(base);
const image = {
  url: "https://cdn.sanity.io/images/tgx6e6jg/production/hero-test.jpg",
  alt: "Hero test",
  dimensions: { width: 1600, height: 1200 },
};
const poster = { ...image, url: image.url.replace("hero-test", "poster-test") };

// Every existing text/CTA section must prefer the edited German CMS values.
const text = { de: "CMS DE", en: "CMS EN" };
const cta = { label: text, href: "/contact" };
const problemImage = {
  url: "https://cdn.sanity.io/images/tgx6e6jg/production/problem-test.jpg",
  alt: "Problem test",
  dimensions: { width: 1400, height: 1050 },
};
const doc: SanityAbo = {
  _id: "abo",
  heroSection: { label: text, headline: text, text, cta, media: { mediaType: "image", image } },
  problemSection: {
    label: text,
    headline: text,
    text: { de: "Absatz 1\n\nAbsatz 2" },
    highlight: text,
    image: problemImage,
  },
  benefitsSection: { items: base.benefits.items.map((item) => ({ id: item.id, title: text, description: text })) },
  processSection: {
    headline: text,
    steps: base.process.steps.map((step, i) => ({ id: step.id, number: `0${4 - i}`, title: text, description: text })),
  },
  scopeSection: { headline: text, introduction: text, items: [{ label: text }], closing: text, highlight: text },
  showreelSection: { label: text, headline: text, text, cta, media: { mediaType: "image", image: poster } },
  closingSection: { label: text, headline: text, text, cta },
  seoSection: { title: text, description: text, ogImage: image },
};

const content = mergeSanityAbo(base, doc, "de");
for (const value of [
  content.hero.label, content.hero.headline, content.hero.body, content.hero.primaryCta.label,
  content.problem.label, content.problem.headline, content.problem.highlight,
  ...content.benefits.items.flatMap((item) => [item.title, item.description]),
  content.process.headline, ...content.process.steps.flatMap((step) => [step.title, step.description]),
  content.scope.headline, content.scope.introduction, ...content.scope.items, content.scope.closing, content.scope.highlight,
  content.showreel.label, content.showreel.headline, content.showreel.body, content.showreel.cta.label,
  content.closing.label, content.closing.headline, content.closing.text, content.closing.cta.label,
  content.seo.title, content.seo.description,
]) assert.equal(value, "CMS DE");
assert.deepEqual(content.process.steps.map((step) => step.number), ["04", "03", "02", "01"]);
assert.deepEqual(content.problem.body, ["Absatz 1", "Absatz 2"]);
assert.deepEqual([content.hero.primaryCta.href, content.showreel.cta.href, content.closing.cta.href], ["/contact", "/contact", "/contact"]);
assert.equal(content.hero.media.src, image.url);
assert.equal(content.hero.media.alt, image.alt);
assert.equal(content.problem.media?.src, problemImage.url);
assert.equal(content.problem.media?.alt, problemImage.alt);
assert.equal(content.showreel.media.src, poster.url);
assert.equal(content.seo.ogImagePath, image.url);
assert.equal(content.showreel.videoId, "");
assert.deepEqual(base, original, "merging must not mutate shared fallback data");
assert.deepEqual(mergeSanityAbo(base, {}, "de"), base, "absent CMS fields preserve existing content and images");
assert.equal(
  mergeSanityAbo(base, { problemSection: { image: { alt: "No asset" } } }, "de").problem.media,
  undefined,
  "problem image without asset stays empty so the layout can show a placeholder",
);

const short = mergeSanityAbo(base, { heroSection: { headline: { de: base.hero.label } } }, "de");
assert.equal(short.hero.headline, base.hero.label, "a shorter edited headline wins over the long fallback");

const wrongHeroMode: SanityAbo = {
  heroSection: { media: { mediaType: "video", image, poster, vimeoUrl: "https://vimeo.com/1216347773" } },
};
assert.equal(mergeSanityAbo(base, wrongHeroMode, "de").hero.media.src, image.url,
  "a leftover video mode must not override a replaced hero image");
assert.equal(mergeSanityAbo(getAboPageContent("en"), wrongHeroMode, "en").hero.media.src, poster.url,
  "the English page retains its existing media behavior");
assert.equal(mergeSanityAbo(base, { heroSection: { media: { mediaType: "video", poster } } }, "de").hero.media.src, poster.url,
  "existing poster-only hero content remains visible");

const cropped = mergeSanityAbo(base, {
  heroSection: { media: { image: {
    asset: { _ref: "image-ef52bd96a0f51eaeeadfc89cc74278f61dec0361-1920x1440-jpg" },
    crop: { top: 0.1, bottom: 0.1, left: 0.1, right: 0.1 },
    hotspot: { x: 0.4, y: 0.5, width: 0.1, height: 0.1 },
    alt: "Crop test",
  } } },
}, "de");
assert.ok(new URL(cropped.hero.media.src).searchParams.has("rect"), "Sanity crop reaches the image URL");
assert.equal(cropped.hero.media.alt, "Crop test");

async function checkRefresh() {
  const requests: { resolve: (response: Response) => void; init?: RequestInit }[] = [];
  const received: SanityAbo[] = [];
  const fakeFetch: typeof fetch = async (url, init) => {
    assert.equal(url, "/api/abo-page.php");
    assert.equal(init?.cache, "no-store");
    return new Promise<Response>((resolve) => requests.push({ resolve, init }));
  };
  const client = createAboRefresh((value) => received.push(value), fakeFetch);
  const response = (document: SanityAbo) => Response.json({ ok: true, document });

  const oldRequest = client.refresh();
  const newRequest = client.refresh();
  assert.equal(requests[0].init?.signal?.aborted, true);
  requests[1].resolve(response(doc));
  await newRequest;
  // Deliberately ignore cancellation in this mock: late JSON must still be ignored.
  requests[0].resolve(response({ _id: "abo", heroSection: { headline: { de: "Old response" } } }));
  await oldRequest;
  assert.deepEqual(received, [doc], "late old requests cannot revert newer content");

  for (const invalid of [
    new Response("Unauthorized", { status: 401 }),
    new Response("Upstream failed", { status: 502 }),
    new Response("<html>not JSON</html>"),
    Response.json({ ok: true, document: null }),
    response({ _id: "drafts.abo" }),
    response({ _id: "homepage" }),
  ]) {
    const pending = client.refresh();
    requests.at(-1)!.resolve(invalid);
    await pending;
    assert.deepEqual(received, [doc], "errors and wrong documents preserve last successful content");
  }

  const pending = client.refresh();
  client.stop();
  assert.equal(requests.at(-1)!.init?.signal?.aborted, true);
  requests.at(-1)!.resolve(response(doc));
  await pending;
  assert.deepEqual(received, [doc], "unmounted page ignores in-flight response");
  const count = requests.length;
  await client.refresh();
  assert.equal(requests.length, count, "stopped refresh never starts another request");
}

checkRefresh().then(() => console.log("OK: /content-abo text, images, crop, fallback, EN isolation and refresh regressions."))
  .catch((error) => { console.error(error); process.exitCode = 1; });
