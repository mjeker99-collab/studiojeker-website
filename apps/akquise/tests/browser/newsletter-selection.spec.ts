import { openWorkspace } from "./open-workspace";
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const access = process.env.E2E_EMAIL && process.env.E2E_PASSWORD
  ? `Lokales synthetisches Konto: ${process.env.E2E_EMAIL}\nEinmaliges Passwort: ${process.env.E2E_PASSWORD}`
  : readFileSync(".local/demo-access.txt", "utf8");
const credential = access.match(/Lokales synthetisches Konto: (\S+)\s+Einmaliges Passwort: (\S+)/);
if (!credential) throw new Error("Lokaler synthetischer Testzugang fehlt.");

for (const width of [768, 1440]) {
  test(`Newsletter-Auswahl führt zu richtigem Editor und richtiger Vorschau (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.getByLabel("E-Mail", { exact: true }).fill(credential[1]);
    await page.getByLabel("Passwort", { exact: true }).fill(credential[2]);
    await page.getByRole("button", { name: /Sicher anmelden/ }).click();
    await openWorkspace(page, "Newsletter");
    await page.getByRole("button", { name: "Aus GitHub importieren", exact: true }).click();
    const editor = page.getByRole("region", { name: "Inhaltseditor" });
    const selection = page.getByRole("region", { name: "Newsletter-Vorlage auswählen" });
    for (const [title, expected] of [
      ["Newsletter 04 · Sichtbarkeit", "Sichtbarkeit ist kein Luxus."],
      ["Newsletter 03 · Sichtbarkeit im Abo", "Einmal auffallen ist gut."],
      ["Newsletter 04 · Sichtbarkeit", "Sichtbarkeit ist kein Luxus."],
    ] as const) {
      const card = page.locator("article[data-content-id]").filter({
        has: page.getByRole("heading", { name: title, exact: true }),
      }).first();
      const previewButton = card.getByRole("button", { name: "Vorschau", exact: true });
      await previewButton.click();
      const dialog = page.getByRole("dialog", { name: "Newsletter-Vorschau" });
      await expect(dialog.getByRole("heading", { name: title, exact: true })).toBeVisible();
      await expect(dialog.frameLocator("iframe").locator("body")).toContainText(expected);
      await dialog.getByRole("button", { name: "Schliessen" }).click();
      await expect(previewButton).toBeFocused();
      await card.getByRole("button", { name: "Inhalt öffnen ↗" }).click();
      await expect(editor).toBeVisible();
      await expect(editor).toBeFocused();
      await expect(selection.getByRole("status")).toContainText(title);
      await expect.poll(async () => editor.evaluate((node) => {
        const r = node.getBoundingClientRect();
        return r.top >= -5 && r.top < window.innerHeight - 60;
      }), { message: "Geöffneter Editor muss ohne Scrollen sichtbar sein" }).toBe(true);
      const preview = editor.locator('iframe[title="Newsletter HTML-Vorschau"]');
      await expect(preview).toBeVisible();
      await expect.poll(async () => (await preview.getAttribute("srcdoc")) || "")
        .toContain(expected);
      await expect(selection.getByRole("button", { name: "Gewählten Newsletter anzeigen" })).toBeVisible();
      await expect(selection.locator(".newsletter-preview")).toHaveCount(0);
    }
    await page.route("**/api/newsletter/check-links", async (route) => {
      const urls = (route.request().postDataJSON() as { urls: string[] }).urls;
      await route.fulfill({ status: 200, json: {
        results: urls.map((url) => ({ url, status: "reachable", detail: "Server erreichbar" })),
      } });
    });
    const tester = editor.getByRole("region", { name: "Newsletter-Links testen" });
    await tester.getByRole("button", { name: /Links testen/ }).click();
    await expect(tester.getByText("Server erreichbar").first()).toBeVisible();
    await expect(tester.locator('a[target="_blank"]').first()).toHaveAttribute("rel", /noopener/);
    await tester.getByRole("checkbox").first().check();
    await expect(tester.getByText(/1 von [0-9]+ Zielen manuell geprüft/)).toBeVisible();
    // Every viewport test works on its own duplicate. Never update the shared
    // imported V4 newsletter: parallel browser tests must remain independent.
    const original = page.locator("article[data-content-id]").filter({
      has: page.getByRole("heading", { name: "Newsletter 04 · Sichtbarkeit", exact: true }),
    }).first();
    const duplicateResponse = page.waitForResponse((response) =>
      response.url().includes("/api/hub/newsletter-duplicate/") &&
      response.request().method() === "POST"
    );
    await original.getByRole("button", { name: "Duplizieren", exact: true }).click();
    const duplicated = await (await duplicateResponse).json();
    const id = duplicated.id as string;
    expect(id).toBeTruthy();
    await expect(editor.getByRole("button", { name: "Korrigierte Video-Vorlage übernehmen" })).toBeVisible();
    const before = await (await page.request.get("/api/hub/state")).json();
    const prior = before.contents.find((c: { id: string }) => c.id === id);
    expect(prior.versions[0].payload.newsletter.templateId).toBe("newsletter-04-github-364bba2");
    const oldImage = prior.versions[0].payload.newsletter.fields["promo_image.image.1"];
    expect(oldImage).toContain("umbrella");
    await editor.getByRole("button", { name: "Korrigierte Video-Vorlage übernehmen" }).click();
    await expect(editor.getByRole("button", { name: "Korrigierte Video-Vorlage übernehmen" })).toHaveCount(0);
    const after = await (await page.request.get("/api/hub/state")).json();
    const updated = after.contents.find((c: { id: string }) => c.id === id);
    expect(updated.version).toBe(prior.version + 1);
    expect(updated.versions[0].payload.newsletter.templateId).toBe("newsletter-04-video-promo-20261103");
    expect(updated.versions[0].payload.newsletter.fields["promo_image.image.1"]).toContain("mcusercontent.com");
    expect(updated.versions[0].payload.newsletter.fields["promo_image.alt.1"]).toBe("Nora Jeker mit Tafel im Büro");
    await expect.poll(async () =>
      (await editor.locator('iframe[title="Newsletter HTML-Vorschau"]').getAttribute("srcdoc")) || "",
    ).toContain("sj-promo-video");
    await expect.poll(async () =>
      (await editor.locator('iframe[title="Newsletter HTML-Vorschau"]').getAttribute("srcdoc")) || "",
    ).toContain("transform:scale(1.35)");
    const x = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(x).toBe(true);
  });
}

test("Textentwurf direkt von der Karte als Newsletter lesen", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");
  await page.getByLabel("E-Mail", { exact: true }).fill(credential[1]);
  await page.getByLabel("Passwort", { exact: true }).fill(credential[2]);
  await page.getByRole("button", { name: /Sicher anmelden/ }).click();
  await expect(page.getByRole("navigation", { name: "Hauptnavigation" })).toBeVisible();
  const { user } = await (await page.request.get("/api/state")).json();
  const draft = {
    kind: "NEWSLETTER", ownerId: user.id, title: "KMU-Videos – Vorschautest",
    subject: "Ihre Arbeit im Film", preheader: "Unternehmerfilm und Reel Duo",
    body: "Guten Tag\n\nEin Film für Ihren Betrieb.\nhttps://example.test/filmidee?utm_campaign=kmu_videos_unternehmerfilm_und_reel_duo_2026\nBeste Grüsse",
    audience: "Test", variants: [], campaignId: null, scheduledAt: null,
  };
  const response = await page.request.post("/api/hub/contents", {
    headers: { Origin: new URL(page.url()).origin }, data: draft,
  });
  expect(response.ok()).toBe(true);
  const { id } = await response.json();
  await openWorkspace(page, "Newsletter");
  const card = page.locator(`article[data-content-id="${id}"]`);
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" && request.url().includes("/api/")) writes.push(request.url());
  });
  await card.getByRole("button", { name: "Vorschau", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Newsletter-Vorschau" });
  await expect(dialog).toContainText(draft.subject);
  await expect(dialog).toContainText(draft.preheader);
  const body = dialog.frameLocator("iframe").locator("body");
  await expect(body.getByText("Ein Film für Ihren Betrieb.", { exact: false })).toBeVisible();
  await expect(dialog.frameLocator("iframe").locator("a[href]")).toHaveCount(0);
  await dialog.getByRole("button", { name: /Mobil · 390/ }).click();
  await expect(dialog.locator("iframe")).toHaveCSS("width", "390px");
  await expect.poll(() => body.evaluate((node) => node.scrollWidth)).toBeLessThanOrEqual(390);
  await dialog.getByRole("button", { name: "Schliessen" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(card.getByText("Entwurf", { exact: true })).toBeVisible();
  await card.getByRole("button", { name: /Inhalt öffnen/ }).click();
  const editor = page.getByRole("region", { name: "Inhaltseditor" });
  await editor.getByLabel("Newsletter-Inhalt").fill("Lokal geänderter Text");
  await expect(editor.frameLocator("iframe").locator("body")).toContainText("Lokal geänderter Text");
  await card.getByRole("button", { name: "Vorschau", exact: true }).click();
  await expect(body).toContainText("Ein Film für Ihren Betrieb.");
  await page.keyboard.press("Escape");
  await expect(editor.getByLabel("Newsletter-Inhalt")).toHaveValue("Lokal geänderter Text");
  expect(writes).toEqual([]);
});
