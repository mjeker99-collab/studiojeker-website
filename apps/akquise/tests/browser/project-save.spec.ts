import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { browserCredentials } from "./credentials";

test("Project save restores an unsent campaign after reload and keeps conflicts visible", async ({
  page,
}) => {
  const credentials = browserCredentials();
  await page.goto("/");
  await page.getByLabel("E-Mail", { exact: true }).fill(credentials.email);
  await page.getByLabel("Passwort", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: /Sicher anmelden/ }).click();
  const open = async () => {
    await page
      .getByRole("navigation", { name: "Hauptnavigation" })
      .getByRole("button", { name: "Kampagnen", exact: true })
      .click();
    await page
      .getByRole("button", { name: "GPT beauftragen", exact: true })
      .click();
  };
  await open();
  const toolbar = page.getByRole("region", {
    name: "Projekt sichern · Kampagnen",
    exact: true,
  });
  const prompt = page.getByLabel("Deine Nachricht", { exact: true });
  const title = `Gesichertes Testprojekt ${Date.now()}`;
  await toolbar.getByLabel("Projektname", { exact: true }).fill(title);
  await prompt.fill("Kampagne zum Relaunch – noch nicht an GPT gesendet.");
  await toolbar
    .getByRole("button", { name: "Projekt sichern", exact: true })
    .click();
  await expect(toolbar.getByRole("status")).toContainText("Projekt gesichert");
  const draftId = await toolbar.getByLabel("Projekt öffnen").inputValue();
  await page.reload();
  await open();
  await toolbar.getByLabel("Projekt öffnen").selectOption(draftId);
  await expect(prompt).toHaveValue(
    "Kampagne zum Relaunch – noch nicht an GPT gesendet.",
  );
  await expect(toolbar.getByRole("status")).toContainText(
    "Gesichertes Projekt geöffnet",
  );
  await expect(toolbar.getByRole("status")).not.toContainText(
    "Ungesicherte Änderungen",
  );
  const response = await page.request.get(
    `/api/project-drafts/${draftId}?area=Kampagnen`,
  );
  const saved = await response.json();
  await page.request.post(`/api/project-drafts/${draftId}`, {
    headers: { origin: new URL(page.url()).origin },
    data: {
      area: "Kampagnen",
      title,
      revision: saved.revision,
      payload: saved.payload,
    },
  });
  await prompt.fill("Mein neuer Entwurf");
  await toolbar
    .getByRole("button", { name: "Projekt sichern", exact: true })
    .click();
  await expect(toolbar.getByRole("alert")).toContainText("anderswo geändert");
  await expect(prompt).toHaveValue("Mein neuer Entwurf");
  await toolbar.getByRole("button", { name: "Als Kopie sichern" }).click();
  await expect(toolbar.getByRole("status")).toContainText("Projekt gesichert");
  for (const width of [1440, 834, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(
      toolbar.getByRole("button", { name: "Projekt sichern", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  expect(
    (await new AxeBuilder({ page }).include(".project-save").analyze())
      .violations,
  ).toEqual([]);
});
