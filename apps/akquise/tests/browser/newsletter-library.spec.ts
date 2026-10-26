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
  // The simplified UI intentionally hides the one-time template import.
  // Seed the synthetic newsletter sources through the authenticated API.
  const imported = await page.evaluate(async () => {
    const response = await fetch("/api/hub/newsletter/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    return response.ok;
  });
  expect(imported).toBe(true);
  await page.reload();
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Newsletter/ })
    .click();
  const source = page.locator("article[data-content-id]").filter({
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
  await expect(
    page.getByRole("status").filter({ hasText: "Version gespeichert" }),
  ).toContainText("Version gespeichert");
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
    await expect
      .poll(
        async () =>
          iframe.locator("body").evaluate((el) => {
            const viewport = el.ownerDocument.documentElement.clientWidth;
            return {
              overflow: el.scrollWidth > viewport,
              viewport,
              width: el.scrollWidth,
              elements: Array.from(el.querySelectorAll("*"))
                .filter(
                  (node) => node.getBoundingClientRect().right > viewport + 1,
                )
                .slice(-12)
                .map((node) => ({
                  tag: node.tagName,
                  class: node.className,
                  text: node.textContent?.trim().slice(0, 80),
                  width: node.getBoundingClientRect().width,
                })),
            };
          }),
        { message: `Newsletter overflow at app viewport ${width}px` },
      )
      .toMatchObject({ overflow: false, viewport: width === 390 ? 390 : 700 });
  }
  // Audit editor controls separately: axe cannot inject scripts into the opaque
  // sandbox. Its title, sandbox, content and layout are checked explicitly here.
  await expect(
    editor.locator('iframe[title="Newsletter HTML-Vorschau"]'),
  ).toHaveAttribute("sandbox", "");
  const results = await new AxeBuilder({ page })
    .include('[aria-label="Inhaltseditor"]')
    .exclude("iframe")
    .analyze();
  expect(results.violations).toEqual([]);
  await editor.getByLabel(/Ich habe die vollständige Version/).check();
  await editor
    .getByRole("button", { name: "Version freigeben", exact: true })
    .click();
  const copy = page.locator("article[data-content-id]").filter({
    has: page.getByRole("heading", {
      name: "Browserprüfung Newsletter",
      exact: true,
    }),
  });
  await expect(copy.getByText("Freigegeben", { exact: true })).toBeVisible();
  await copy.getByRole("button", { name: /Inhalt öffnen/ }).click();
  const download = page.waitForEvent("download");
  await editor.getByRole("button", { name: "HTML & Text exportieren" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.html$/);
});
