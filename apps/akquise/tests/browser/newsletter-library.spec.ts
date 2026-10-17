import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
const access =
  process.env.E2E_EMAIL && process.env.E2E_PASSWORD
    ? `Lokales synthetisches Konto: ${process.env.E2E_EMAIL}\nEinmaliges Passwort: ${process.env.E2E_PASSWORD}`
    : readFileSync(".local/demo-access.txt", "utf8");
const credential = access.match(
  /Lokales synthetisches Konto: (\S+)\s+Einmaliges Passwort: (\S+)/,
)!;

test("Newsletter library: import, edit, preview, copy and export", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("E-Mail", { exact: true }).fill(credential[1]);
  await page.getByLabel("Passwort", { exact: true }).fill(credential[2]);
  await page.getByRole("button", { name: /Sicher anmelden/ }).click();
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Newsletter/ })
    .click();
  await page
    .getByRole("button", { name: "Bestehende Ausgaben importieren" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Vorhandene Newsletter übernommen",
  );
  const source = page
    .locator("article[data-content-id]")
    .filter({
      has: page.getByRole("heading", {
        name: "Newsletter 02 · Visibility",
        exact: true,
      }),
    });
  await source
    .getByRole("button", { name: "Duplizieren", exact: true })
    .click();
  const editor = page.getByRole("region", { name: "Inhaltseditor" });
  await expect(editor.getByLabel("Interner Titel")).toHaveValue(/Kopie/);
  await editor.getByLabel("Interner Titel").fill("Browserprüfung Newsletter");
  await editor
    .getByLabel("Empfänger / Zielgruppensegment")
    .fill("Synthetische Testzielgruppe");
  await editor.getByText("Hero", { exact: true }).click();
  await editor
    .getByLabel(/Hero · Text/)
    .first()
    .fill("Unsere neue Headline");
  await editor
    .getByRole("button", { name: "Version speichern", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Version gespeichert");
  const iframe = editor.frameLocator(
    'iframe[title="Newsletter HTML-Vorschau"]',
  );
  await expect(
    iframe.getByRole("heading", { name: "Unsere neue Headline" }),
  ).toBeVisible();
  await expect(iframe.locator("a[href]")).toHaveCount(0);
  await expect(
    editor.getByRole("button", { name: "HTML & Text exportieren" }),
  ).toBeDisabled();
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await editor
      .getByRole("button", {
        name: width === 390 ? "Mobil · 390 px" : "Desktop · 700 px",
        exact: true,
      })
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(
      await iframe
        .locator("body")
        .evaluate(
          (el) =>
            el.scrollWidth <= el.ownerDocument.documentElement.clientWidth,
        ),
    ).toBe(true);
  }
  const results = await new AxeBuilder({ page })
    .include('[aria-label="Inhaltseditor"]')
    .disableRules(["frame-tested"])
    .analyze();
  expect(results.violations).toEqual([]);
  await editor.getByLabel(/Ich habe die vollständige Version/).check();
  await editor
    .getByRole("button", { name: "Version freigeben", exact: true })
    .click();
  const copy = page
    .locator("article[data-content-id]")
    .filter({
      has: page.getByRole("heading", {
        name: "Browserprüfung Newsletter",
        exact: true,
      }),
    });
  await copy.getByRole("button", { name: /Inhalt öffnen/ }).click();
  const download = page.waitForEvent("download");
  await editor.getByRole("button", { name: "HTML & Text exportieren" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.html$/);
});
