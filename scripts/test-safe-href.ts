/**
 * Regression checks for internal URL normalization (staging leak prevention).
 * Run: npx tsx scripts/test-safe-href.ts
 */
import { sanitizeHref } from "../lib/security/safe-href";
import { getAlternateLocalePath } from "../lib/i18n/config";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function main() {
  assert(
    sanitizeHref("https://staging2026.studiojeker.ch/content-abo/") ===
      "/content-abo/",
    "staging content-abo becomes relative",
  );
  assert(
    sanitizeHref("https://www.studiojeker.ch/work/") === "/work/",
    "www absolute becomes relative",
  );
  assert(
    sanitizeHref("https://studiojeker.ch/about/") === "/about/",
    "apex absolute becomes relative",
  );
  assert(
    sanitizeHref("https://example.com/page") === "https://example.com/page",
    "external https preserved",
  );
  assert(sanitizeHref("/content-abo/") === "/content-abo/", "relative kept");
  assert(sanitizeHref("javascript:alert(1)") === "", "javascript blocked");
  assert(sanitizeHref("//evil.example/x") === "", "protocol-relative blocked");

  assert(
    getAlternateLocalePath("/content-abo/", "en") === "/en/content-subscription",
    "abo slug translates for EN",
  );
  assert(
    getAlternateLocalePath("/content-abo/", "de") === "/content-abo",
    "abo slug stays DE for DE",
  );

  console.log("safe-href tests passed");
}

main();
