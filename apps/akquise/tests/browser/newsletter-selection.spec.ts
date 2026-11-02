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
    await page.getByRole("navigation", { name: "Hauptnavigation" })
      .getByRole("button", { name: /Newsletter/ }).click();
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
    await expect(editor.getByRole("button", { name: "Video-Vorlage übernehmen" })).toBeVisible();
    const before = await (await page.request.get("/api/hub/state")).json();
    const prior = before.contents.find((c: { id: string }) => c.id === id);
    expect(prior.versions[0].payload.newsletter.templateId).toBe("newsletter-04-github-364bba2");
    const oldImage = prior.versions[0].payload.newsletter.fields["promo_image.image.1"];
    await editor.getByRole("button", { name: "Video-Vorlage übernehmen" }).click();
    await expect(editor.getByRole("button", { name: "Video-Vorlage übernehmen" })).toHaveCount(0);
    const after = await (await page.request.get("/api/hub/state")).json();
    const updated = after.contents.find((c: { id: string }) => c.id === id);
    expect(updated.version).toBe(prior.version + 1);
    expect(updated.versions[0].payload.newsletter.templateId).toBe("newsletter-04-video-promo-20261102");
    expect(updated.versions[0].payload.newsletter.fields["promo_image.image.1"]).toBe(oldImage);
    await expect.poll(async () =>
      (await editor.locator('iframe[title="Newsletter HTML-Vorschau"]').getAttribute("srcdoc")) || "",
    ).toContain("sj-promo-video");
    const x = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(x).toBe(true);
  });
}
