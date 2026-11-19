import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { browserCredentials } from "./credentials";

test("Bibliothek: Ordner, Verschieben, globale Suche und Papierkorb", async ({
  page,
}) => {
  test.setTimeout(90000);
  const credentials = browserCredentials();
  const suffix = Date.now().toString();
  const rootName = `Testkunde ${suffix}`;
  const title = `Ordnertext ${suffix}`;
  await page.goto("/");
  await page.getByLabel("E-Mail", { exact: true }).fill(credentials.email);
  await page.getByLabel("Passwort", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: /Sicher anmelden/ }).click();
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Bibliothek/ })
    .click();
  await page.getByRole("button", { name: "Neuer Ordner", exact: true }).click();
  await page.getByLabel("Ordnername").fill(rootName);
  await page.getByRole("button", { name: "Ordner speichern" }).click();
  await page
    .locator(".library-folder-card")
    .getByRole("button", { name: new RegExp(rootName) })
    .click();
  await page.getByRole("button", { name: "Neuer Ordner", exact: true }).click();
  await page.getByLabel("Ordnername").fill("Projekt A");
  await page.getByRole("button", { name: "Ordner speichern" }).click();
  await page
    .locator(".library-folder-card")
    .getByRole("button", { name: /Projekt A/ })
    .click();
  await page.getByRole("button", { name: "Text erfassen" }).click();
  await page.getByLabel("Titel", { exact: true }).fill(title);
  await page
    .getByLabel("Text", { exact: true })
    .fill("Synthetischer Inhalt für den Ordnertest.");
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(
    page.locator(".library-card").filter({ hasText: title }),
  ).toBeVisible();
  await page.getByLabel(`${title} auswählen`, { exact: true }).check();
  await page.getByRole("button", { name: "Auswahl verschieben" }).click();
  await expect(
    page.locator(".library-card").filter({ hasText: title }),
  ).toHaveCount(0);
  await page.getByLabel("Suche", { exact: true }).fill(title);
  await expect(
    page.locator(".library-card").filter({ hasText: title }),
  ).toBeVisible();
  await page.locator(".library-card").filter({ hasText: title }).click();
  await page
    .getByLabel("Ablageordner")
    .selectOption({ label: `Bibliothek / ${rootName} / Projekt A` });
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await page.getByLabel("Suche", { exact: true }).fill("");
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Ordner löschen", exact: true })
    .click();
  await page.getByRole("button", { name: "Papierkorb", exact: true }).click();
  await expect(
    page.locator(".library-folder-card").filter({ hasText: "Projekt A" }),
  ).toBeVisible();
  await page
    .locator(".library-folder-card")
    .filter({ hasText: "Projekt A" })
    .getByRole("button", { name: "Ordner wiederherstellen" })
    .click();
  await page.getByRole("button", { name: "Zurück zu den Ordnern" }).click();
  await page
    .locator(".library-folder-card")
    .getByRole("button", { name: /Projekt A/ })
    .click();
  await expect(
    page.locator(".library-card").filter({ hasText: title }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ordner bearbeiten", exact: true })
    .click();
  await page.getByLabel("Ordnername").fill("Projekt B");
  await page.getByRole("button", { name: "Ordner speichern" }).click();
  await expect(
    page.getByRole("navigation", { name: "Ordnerpfad" }),
  ).toContainText("Projekt B");
  await page.reload();
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Bibliothek/ })
    .click();
  await page.getByLabel("Suche", { exact: true }).fill(title);
  await expect(
    page.locator(".library-card").filter({ hasText: title }),
  ).toContainText("Projekt B");
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  const accessibility = await new AxeBuilder({ page })
    .include(".library-folders")
    .analyze();
  expect(accessibility.violations).toEqual([]);
  // Keep the shared synthetic browser database clean for subsequent scenarios.
  const cleanup = await page.evaluate(async (name) => {
    const state = await (await fetch("/api/library/state")).json();
    const folder = state.folders.find((f: { name: string }) => f.name === name);
    return (
      await fetch("/api/library/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: folder.id,
          revision: folder.revision,
          type: "folder",
          restore: false,
        }),
      })
    ).ok;
  }, rootName);
  expect(cleanup).toBe(true);
});
