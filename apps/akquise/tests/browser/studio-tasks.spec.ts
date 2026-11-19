import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { browserCredentials } from "./credentials";
import { mkdirSync } from "node:fs";

test("Content tasks are directly available and preserve drafts when GPT and editor alternate", async ({
  page,
}) => {
  const credentials = browserCredentials();
  await page.goto("/");
  await page.getByLabel("E-Mail", { exact: true }).fill(credentials.email);
  await page.getByLabel("Passwort", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: /Sicher anmelden/ }).click();
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Content Studio/ })
    .click();
  const picker = page.getByRole("region", {
    name: "Aufgaben im Content-Studio",
  });
  for (const label of [
    "Texte erstellen",
    "Bild erstellen",
    "Bild bearbeiten",
    "Grafik gestalten",
    "Video planen",
    "Prüfen & exportieren",
  ]) {
    await expect(
      picker.getByRole("button", { name: label, exact: true }),
    ).toBeVisible();
  }
  let providerRequests = 0;
  page.on("request", (request) => {
    if (/\/api\/studio\/(jobs|run\/)/.test(request.url())) providerRequests++;
  });
  await picker
    .getByRole("button", { name: "Texte erstellen", exact: true })
    .click();
  await expect(page.getByLabel("Deine Nachricht", { exact: true })).toHaveValue(
    /Social-Media-Beitrag/,
  );
  await picker
    .getByRole("button", { name: "Video planen", exact: true })
    .click();
  await expect(page.getByLabel("Deine Nachricht", { exact: true })).toHaveValue(
    /Drehbuch/,
  );
  await expect(page.locator("#studio-chat-intent")).toHaveValue("VIDEO");
  await picker
    .getByRole("button", { name: "Bild bearbeiten", exact: true })
    .click();
  await expect(page.locator("#studio-chat-intent")).toHaveValue("EDIT");
  await expect(
    page.getByRole("button", { name: "Bild jetzt bearbeiten", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Deine Nachricht", { exact: true })
    .fill("Meine noch nicht gesendete Bildkorrektur");
  await picker
    .getByRole("button", { name: "Grafik gestalten", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Briefing", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Serientitel", exact: true })
    .fill("Mein ungespeichertes Grafikbriefing");
  await page
    .getByRole("button", { name: "Mit GPT arbeiten", exact: true })
    .click();
  await expect(page.getByLabel("Deine Nachricht", { exact: true })).toHaveValue(
    "Meine noch nicht gesendete Bildkorrektur",
  );
  await page
    .getByRole("button", { name: "Beiträge bearbeiten", exact: true })
    .click();
  await expect(page.getByRole("textbox", { name: "Serientitel", exact: true })).toHaveValue(
    "Mein ungespeichertes Grafikbriefing",
  );
  await picker
    .getByRole("button", { name: "Bild erstellen", exact: true })
    .click();
  await expect(page.getByRole("textbox", { name: "Serientitel", exact: true })).toHaveValue(
    "Mein ungespeichertes Grafikbriefing",
  );
  await picker
    .getByRole("button", { name: "Prüfen & exportieren", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Beitragsserien" }),
  ).toBeVisible();
  mkdirSync(".local/hub-screenshots", { recursive: true });
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await picker.scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const button of await picker.getByRole("button").all()) {
      const box = await button.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({
      path: `.local/hub-screenshots/studio-tasks-${width}.png`,
    });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const gpt = page.getByRole("button", {
      name: "Mit GPT arbeiten",
      exact: true,
    });
    await expect(gpt).toBeInViewport();
  }
  const scan = await new AxeBuilder({ page })
    .include(".studio-task-picker")
    .include(".studio-task-toolbar")
    .analyze();
  expect(scan.violations).toEqual([]);
  expect(providerRequests).toBe(0);
});
