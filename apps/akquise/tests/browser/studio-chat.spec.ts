import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { browserCredentials } from "./credentials";
import { mkdirSync } from "node:fs";
test("Content chat is accessible on iPad and phone and disabled without provider", async ({
  page,
}) => {
  const c = browserCredentials();
  await page.goto("/");
  await page.getByLabel("E-Mail", { exact: true }).fill(c.email);
  await page.getByLabel("Passwort", { exact: true }).fill(c.password);
  await page.getByRole("button", { name: /Sicher anmelden/ }).click();
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Content-Studio/ })
    .click();
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByLabel("Deine Nachricht", { exact: true }).fill("");
    await expect(
      page.getByRole("heading", { name: "Was möchtest du machen?" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Neues Briefing", exact: true }),
    ).not.toBeVisible();
    await expect(page.getByLabel("Auftrag", { exact: true })).not.toBeVisible();
    await expect(
      page.getByLabel("Bild hochladen (JPEG, PNG oder WebP, maximal 8 MB)"),
    ).not.toBeVisible();
    mkdirSync(".local/hub-screenshots", { recursive: true });
    await page.screenshot({
      path: `.local/hub-screenshots/studio-simple-${width}.png`,
      fullPage: true,
    });
    await page
      .getByLabel("Deine Nachricht", { exact: true })
      .fill("Ein animiertes Sujet");
    await expect(
      page.getByRole("button", { name: "An GPT senden", exact: true }),
    ).toBeDisabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page
    .getByText("Was GPT über dich und die Firma weiss", { exact: true })
    .click();
  await page
    .getByLabel("Was soll GPT über deine Rolle und Arbeitsweise wissen?", {
      exact: true,
    })
    .fill("SYNTHETISCH: Bitte kurze Erklärungen für das interne Testkonto.");
  await page
    .getByRole("button", { name: "Meine Vorgaben speichern", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Deine Vorgaben sind gespeichert",
  );
  await page.reload();
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Content-Studio/ })
    .click();
  await page
    .getByText("Was GPT über dich und die Firma weiss", { exact: true })
    .click();
  await expect(
    page.getByLabel("Was soll GPT über deine Rolle und Arbeitsweise wissen?", {
      exact: true,
    }),
  ).toHaveValue(
    "SYNTHETISCH: Bitte kurze Erklärungen für das interne Testkonto.",
  );
  const scan = await new AxeBuilder({ page }).include(".studio-chat").analyze();
  expect(scan.violations).toEqual([]);
});
