import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { browserCredentials } from "./credentials";

test("Customer knowledge persists and is usable on mobile and desktop", async ({
  page,
}) => {
  const credentials = browserCredentials();
  await page.goto("/");
  await page.getByLabel("E-Mail", { exact: true }).fill(credentials.email);
  await page.getByLabel("Passwort", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: /Sicher anmelden/ }).click();
  const navigation = page.getByRole("navigation", { name: "Hauptnavigation" });
  await navigation.getByRole("button", { name: /Kunden/ }).click();
  await page.getByRole("button", { name: /Kunde erfassen/ }).click();
  const name = `Synthetisches Wissensprofil ${Date.now()}`;
  await page.getByLabel("Firma / Kundenname").fill(name);
  await page
    .getByLabel("Angebote & Leistungen", { exact: true })
    .fill("Renovationen und Umbauten");
  await page
    .getByLabel("Tonalität & Sprache", { exact: true })
    .fill("Schweizer Hochdeutsch, sachlich");
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(
    page.getByText("Kunde gespeichert.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await navigation.getByRole("button", { name: /Kunden/ }).click();
  await page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name, exact: true }) })
    .getByRole("button", { name: "Bearbeiten", exact: true })
    .click();
  await expect(
    page.getByLabel("Angebote & Leistungen", { exact: true }),
  ).toHaveValue("Renovationen und Umbauten");
  await expect(
    page.getByLabel("Tonalität & Sprache", { exact: true }),
  ).toHaveValue("Schweizer Hochdeutsch, sachlich");
  for (const width of [1440, 820, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(
    (await new AxeBuilder({ page }).include(".hub-editor").analyze())
      .violations,
  ).toEqual([]);
});
