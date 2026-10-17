import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { browserCredentials } from "./credentials";
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
    await expect(
      page.getByRole("heading", { name: "Mit GPT entwickeln" }),
    ).toBeVisible();
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
  const scan = await new AxeBuilder({ page }).include(".studio-chat").analyze();
  expect(scan.violations).toEqual([]);
});
