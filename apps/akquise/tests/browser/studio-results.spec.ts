import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";

test("Results show images and readable text, and library thumbnails appear before selection", async ({ page }) => {
  const user = { id: "synthetic", name: "Testperson" };
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFUlEQVQYlWNg+P+fMGIYVcQw+IIAAEcUHvBhYS22AAAAAElFTkSuQmCC", "base64");
  const state = {
    series: [], campaigns: [], customers: [], users: [user], brand: {},
    assets: [{ id: "library-image", name: "Nora mit Tafel.png", mime: "image/png", kind: "ORIGINAL" }],
    jobs: [
      { id: "image", seriesId: "series", kind: "IMAGE", status: "SUCCEEDED", model: "hidden-model", reserveUsd: 0.25, createdAt: "2026-11-02T12:00:00Z", input: {}, result: { assetId: "result-image", sha256: "internal-checksum" } },
      { id: "text", seriesId: "series", kind: "TEXT", status: "SUCCEEDED", model: "hidden-model", reserveUsd: 0.1, createdAt: "2026-11-02T12:00:00Z", input: {}, result: { posts: [{ headline: "Sichtbarkeit im Abo", variants: [{ channel: "LINKEDIN", text: "Dein Unternehmen sichtbar machen.", cta: "Gespräch vereinbaren" }], hashtags: "#Sichtbarkeit" }] } },
      { id: "chat", seriesId: "series", kind: "CHAT", status: "SUCCEEDED", model: "hidden-model", reserveUsd: 0.1, createdAt: "2026-11-02T12:00:00Z", input: {}, result: { reply: '```json\n{"reply":"Hier ist dein Vorschlag.","assetId":"internal-id"}\n```' } },
    ],
    config: { connected: true, storage: "S3", textReserve: 0.1, imageReserve: 0.25, dailyRequests: 20, dailyBudget: 5 },
  };
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/state") return route.fulfill({ json: { user, users: [user], contacts: [], drafts: [], deliveries: [], suppressions: [], audits: [], generator: "synthetic", externalSending: false, mailMode: "disabled" } });
    if (path === "/api/studio/state") return route.fulfill({ json: state });
    if (path === "/api/project-drafts") return route.fulfill({ json: [] });
    if (path === "/api/hub/state") return route.fulfill({ json: { users: [user], campaigns: [], contents: [], drafts: [] } });
    if (path === "/api/drive/status") return route.fulfill({ json: { configured: false, connection: null } });
    if (path.startsWith("/api/studio/assets/")) return route.fulfill({ body: png, contentType: "image/png" });
    return route.fulfill({ status: 400, json: { error: "Test route unavailable" } });
  });
  await page.goto("/");
  await page.getByRole("navigation", { name: "Hauptnavigation" }).getByRole("button", { name: /Content Studio/ }).click();
  await page.getByText("Bild hinzufügen oder auswählen", { exact: true }).click();
  const gallery = page.locator(".studio-image-grid");
  await expect(gallery.getByRole("img", { name: "Nora mit Tafel.png" })).toBeVisible();
  await expect(gallery.getByRole("checkbox")).not.toBeChecked();
  await page.getByLabel("Bilder suchen").fill("unbekannt");
  await expect(gallery.getByRole("img")).toHaveCount(0);
  await page.getByLabel("Bilder suchen").fill("Nora");
  await expect(gallery.getByRole("img")).toHaveCount(1);
  await page.getByRole("button", { name: "Beiträge bearbeiten", exact: true }).click();
  const results = page.locator(".studio-jobs");
  await expect(results.getByRole("img", { name: "Erzeugtes Bild" })).toBeVisible();
  await expect(results).toContainText("Sichtbarkeit im Abo");
  await expect(results).toContainText("Hier ist dein Vorschlag.");
  await expect(results).not.toContainText(/internal-|hidden-model|sha256/);
  await expect(results.locator("pre")).toHaveCount(0);
  mkdirSync(".local/hub-screenshots", { recursive: true });
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await results.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `.local/hub-screenshots/studio-results-${width}.png` });
  }
  expect((await new AxeBuilder({ page }).include(".studio-jobs").analyze()).violations).toEqual([]);
});
