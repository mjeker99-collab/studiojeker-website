import { test } from "node:test";
import assert from "node:assert/strict";
import { approvedLinkUrl, checkNewsletterLink } from "../lib/hub/newsletter-link-check";

test("only trusted public hosts can be probed automatically", () => {
  for (const url of [
    "https://www.studiojeker.ch/content-abo/",
    "https://vimeo.com/1216349266",
    "https://mcusercontent.com/abc/images/promo.png",
    "https://raw.githubusercontent.com/mjeker99-collab/studiojeker-website/main/a.png",
  ]) assert.ok(approvedLinkUrl(url));
  for (const url of [
    "http://www.studiojeker.ch",
    "https://localhost/private",
    "https://127.0.0.1/private",
    "https://studiojeker.ch.attacker.example/path",
    "https://user:secret@www.studiojeker.ch/path",
    "https://www.studiojeker.ch:8443/path",
    "file:///etc/passwd",
  ]) assert.equal(approvedLinkUrl(url), null);
});

test("reachable, broken, and unverified links remain distinct", async () => {
  const url = "https://www.studiojeker.ch/content-abo/#visibility";
  const ok = await checkNewsletterLink(url, (async (u, options) => {
    assert.equal(String(u), "https://www.studiojeker.ch/content-abo/");
    assert.equal((options as RequestInit).method, "HEAD");
    assert.equal((options as RequestInit).redirect, "manual");
    return new Response(null, { status: 200 });
  }) as typeof fetch);
  assert.equal(ok.status, "reachable");
  const broken = await checkNewsletterLink(url, (async () =>
    new Response(null, { status: 404 })) as typeof fetch);
  assert.equal(broken.status, "broken");
  const requiresReview = await checkNewsletterLink(url, (async () =>
    new Response(null, { status: 403 })) as typeof fetch);
  assert.equal(requiresReview.status, "review");
});

test("no request is issued for an unknown host", async () => {
  const result = await checkNewsletterLink("https://example.com/", (async () => {
    throw new Error("Never fetch unknown domains");
  }) as typeof fetch);
  assert.equal(result.status, "review");
});
