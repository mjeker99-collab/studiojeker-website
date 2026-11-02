import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const access =
  process.env.E2E_EMAIL && process.env.E2E_PASSWORD
    ? `Lokales synthetisches Konto: ${process.env.E2E_EMAIL}\nEinmaliges Passwort: ${process.env.E2E_PASSWORD}`
    : readFileSync(".local/demo-access.txt", "utf8");
const credential = access.match(
  /Lokales synthetisches Konto: (\S+)\s+Einmaliges Passwort: (\S+)/,
)!;

test("Newsletter task: one wish, one primary action, status survives reload", async ({
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
    has: page.getByRole("heading", { name: "Newsletter 02 · Visibility", exact: true }),
  });
  await source.getByRole("button", { name: "Duplizieren", exact: true }).click();
  const title = `Browserprüfung Auftrag ${Date.now()}`;
  const editor = page.getByRole("region", { name: "Inhaltseditor" });
  await editor.getByLabel("Interner Titel").fill(title);
  await editor.getByLabel("Empfänger / Zielgruppensegment").fill("Synthetische Zielgruppe");
  await editor.getByRole("button", { name: "Version speichern", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Version gespeichert" })).toBeVisible();
  const task = editor.getByRole("region", { name: "Newsletter-Auftrag" });
  await expect(task.getByLabel("Dein Wunsch")).toHaveValue("Text redaktionell kürzen");
  const primary = task.getByRole("button", { name: "Newslettertext überarbeiten", exact: true });
  const layout = task.getByRole("button", { name: "Layoutänderung umsetzen", exact: true });
  await expect(primary).toBeEnabled();
  await expect(layout).toBeEnabled();
  await primary.click();
  await expect(task.getByRole("status")).toContainText(/nicht verbunden|gespeichert und wird bearbeitet/);
  await expect(task.getByRole("status")).toContainText("nicht verbunden", { timeout: 10000 });
  await page.reload();
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Newsletter/ })
    .click();
  const copy = page.locator("article[data-content-id]").filter({
    has: page.getByRole("heading", { name: title, exact: true }),
  });
  await copy.getByRole("button", { name: /Inhalt öffnen/ }).click();
  const reopened = page.getByRole("region", { name: "Inhaltseditor" });
  const reopenedTask = reopened.getByRole("region", { name: "Newsletter-Auftrag" });
  await expect(reopenedTask.getByRole("status")).toContainText("nicht verbunden");
  await reopenedTask.getByRole("button", { name: "Layoutänderung umsetzen", exact: true }).click();
  await expect(reopenedTask.getByRole("status")).toContainText("PR #322");
  for (const width of [700, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const box = await reopened.boundingBox();
    expect(box?.width || 0).toBeLessThanOrEqual(width);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow).toBe(false);
    await expect(reopened.getByRole("region", { name: "Newsletter-Auftrag" })).toBeVisible();
  }
});
