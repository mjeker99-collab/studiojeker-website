import { test } from "node:test";
import assert from "node:assert/strict";
import {
  siteSaveInput,
  sitePublishInput,
  siteMediaInput,
  validatedFieldValues,
} from "../lib/site-cms/input";
import { findSitePage, sitePages, draftId } from "../lib/site-cms/pages";
import {
  siteCmsProject,
  siteCmsDataset,
  siteCmsPublishAllowed,
} from "../lib/site-cms/config";
import { siteQuery, siteMutate, sitePublishAction } from "../lib/site-cms/client";
import { PolicyError } from "../lib/policy";

test("site pages reuse existing Sanity singletons and allowlisted fields", () => {
  assert.equal(siteCmsProject, "tgx6e6jg");
  assert.equal(siteCmsDataset, "production");
  assert.ok(sitePages.length >= 6);
  assert.equal(findSitePage("homepage")?.id.length, 36);
  assert.equal(draftId("about"), "drafts.about");
  assert.ok(
    findSitePage("homepage")?.fields.some((f) => f.group === "seo"),
  );
  assert.ok(
    findSitePage("about")?.fields.some((f) => f.kind === "image"),
  );
});

test("rejects unknown pages, unknown fields and overlong values", () => {
  assert.equal(
    siteSaveInput.safeParse({
      pageKey: "unknown",
      revision: "1",
      values: {},
    }).success,
    false,
  );
  assert.throws(() =>
    validatedFieldValues("homepage", { notAllowed: "x" }),
  );
  assert.throws(() =>
    validatedFieldValues("about", {
      heroHeadline: "x".repeat(200),
    }),
  );
  assert.throws(() =>
    validatedFieldValues("homepage", {
      heroImage: { url: "https://cdn.sanity.io/x.jpg" },
    }),
  );
});

test("publish confirmation is required and publish gate defaults off", () => {
  assert.equal(
    sitePublishInput.safeParse({
      pageKey: "about",
      revision: "1",
      confirmed: false,
    }).success,
    false,
  );
  assert.equal(
    sitePublishInput.safeParse({
      pageKey: "about",
      revision: "1",
      confirmed: true,
    }).success,
    true,
  );
  const previous = process.env.SITE_CMS_ALLOW_PUBLISH;
  delete process.env.SITE_CMS_ALLOW_PUBLISH;
  assert.equal(siteCmsPublishAllowed(), false);
  process.env.SITE_CMS_ALLOW_PUBLISH = "true";
  assert.equal(siteCmsPublishAllowed(), true);
  if (previous === undefined) delete process.env.SITE_CMS_ALLOW_PUBLISH;
  else process.env.SITE_CMS_ALLOW_PUBLISH = previous;
});

test("media upload input bounds filename and type", () => {
  assert.equal(
    siteMediaInput.safeParse({
      pageKey: "about",
      fieldKey: "heroImage",
      revision: "1",
      filename: "hero.exe",
      contentType: "image/jpeg",
      data: "aa",
    }).success,
    false,
  );
  assert.equal(
    siteMediaInput.safeParse({
      pageKey: "about",
      fieldKey: "heroImage",
      revision: "1",
      filename: "hero.jpg",
      contentType: "image/jpeg",
      data: "aa",
    }).success,
    true,
  );
});

test("Sanity client stays on Studiojeker project and hides provider errors", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.hostname, "tgx6e6jg.api.sanity.io");
      assert.equal(url.pathname.includes("/production"), true);
      assert.equal(url.searchParams.get("perspective"), "published");
      assert.equal(init?.cache, "no-store");
      return Response.json({ result: [{ _id: "about" }] });
    };
    assert.deepEqual(await siteQuery("*[_type==$t]", { t: "about" }), [
      { _id: "about" },
    ]);
    globalThis.fetch = async () =>
      new Response("secret-provider-details", { status: 401 });
    await assert.rejects(
      siteQuery("*[]"),
      (e) => e instanceof PolicyError && !e.message.includes("secret-provider"),
    );
    delete process.env.SANITY_API_WRITE_TOKEN;
    await assert.rejects(
      siteMutate([{ patch: { id: "drafts.about", set: { x: 1 } } }]),
      (e) => e instanceof PolicyError && e.message.includes("WRITE_TOKEN"),
    );
    await assert.rejects(
      sitePublishAction("about", "drafts.about"),
      (e) => e instanceof PolicyError && e.message.includes("WRITE_TOKEN"),
    );
  } finally {
    globalThis.fetch = original;
  }
});
