import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { browserCredentials } from "./credentials";
import { chapters } from "../../lib/concepts/input";
import { mkdir } from "node:fs/promises";

test("Concept editor persists, approves, exports and hands off on desktop, iPad and phone", async ({
  page,
}) => {
  test.setTimeout(90000);
  const credentials = browserCredentials();
  await page.goto("/");
  await page.getByLabel("E-Mail", { exact: true }).fill(credentials.email);
  await page.getByLabel("Passwort", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: /Sicher anmelden/ }).click();
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Strategie & Konzepte/ })
    .click();
  const editor = page.getByRole("region", { name: "Konzeptentwicklung" });
  await expect(
    editor.getByRole("heading", { name: "1. Thema und Auftrag" }),
  ).toBeVisible();
  await editor
    .getByRole("button", { name: "Kampagne planen", exact: true })
    .click();
  await expect(
    editor.getByLabel("Was möchtest du entwickeln?", { exact: true }),
  ).toHaveValue(/Zeitraum und Budget/);
  await expect(
    editor.getByRole("button", { name: "Mit GPT entwickeln", exact: true }),
  ).toBeDisabled();
  await editor
    .getByLabel("Titel", { exact: true })
    .fill("Synthetisches Kommunikationskonzept");
  for (const [, title] of chapters)
    await editor
      .getByLabel(title, { exact: true })
      .fill(
        `Geprüfter Testinhalt für ${title}. Offene Annahmen bleiben bezeichnet.`,
      );
  await editor
    .getByRole("button", { name: "Konzept speichern", exact: true })
    .click();
  await expect(
    editor.getByRole("heading", { name: "2. Dein Konzept · Version 1" }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Strategie & Konzepte/ })
    .click();
  await editor.getByLabel("Konzept auswählen").selectOption({
    label: "Synthetisches Kommunikationskonzept · V1 · Entwurf",
  });
  await expect(
    editor.getByLabel("Briefing & Ausgangslage", { exact: true }),
  ).toHaveValue(/Geprüfter Testinhalt/);
  await expect(
    editor.getByRole("button", { name: "Mit GPT entwickeln", exact: true }),
  ).toBeDisabled();
  await editor
    .getByLabel("Ich habe diese Version vollständig geprüft.", { exact: true })
    .check();
  await editor.getByRole("button", { name: "Version 1 freigeben" }).click();
  await expect(
    editor.getByText("Konzeptversion freigegeben.", { exact: true }),
  ).toBeVisible();
  const word = await editor
    .getByRole("link", { name: "Gespeicherte Version als Word" })
    .getAttribute("href");
  const response = await page.request.get(word!);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("wordprocessingml");
  expect((await response.body()).subarray(0, 2).toString()).toBe("PK");
  const printLink = await editor
    .getByRole("link", { name: "PDF / Druckansicht" })
    .getAttribute("href");
  const print = await page.context().newPage();
  await print.goto(printLink!);
  await expect(
    print.getByRole("heading", { name: "Synthetisches Kommunikationskonzept" }),
  ).toBeVisible();
  await expect(print.locator("h2")).toHaveCount(8);
  await mkdir(".local/concept-screenshots", { recursive: true });
  await print.pdf({
    path: ".local/concept-screenshots/konzept.pdf",
    format: "A4",
    printBackground: true,
  });
  await print.close();
  await editor.getByLabel("Kampagnenbeginn").fill("2026-11-01");
  await editor.getByLabel("Kampagnenende").fill("2026-12-01");
  await editor
    .getByRole("button", { name: "Neue Kampagne erstellen", exact: true })
    .click();
  await expect(
    editor.getByText("Diese Version wurde bereits übernommen."),
  ).toBeVisible();
  for (const width of [1440, 1180, 820, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.local/concept-screenshots/konzept-${width}.png`,
      fullPage: true,
    });
  }
  const axe = await new AxeBuilder({ page }).include(".concepts").analyze();
  expect(axe.violations).toEqual([]);
  await editor
    .getByLabel("Botschaften, Tonalität & Leitidee", { exact: true })
    .fill("Überarbeitete Botschaft");
  await editor
    .getByRole("button", { name: "Als neue Version speichern" })
    .click();
  await expect(
    editor.getByRole("heading", { name: "2. Dein Konzept · Version 2" }),
  ).toBeVisible();
  await expect(
    editor.getByRole("button", { name: "Version 2 freigeben" }),
  ).toBeDisabled();
  await expect(
    editor.getByRole("button", {
      name: "Neue Kampagne erstellen",
      exact: true,
    }),
  ).toHaveCount(0);
});
