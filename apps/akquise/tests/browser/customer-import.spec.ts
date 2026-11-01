import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { browserCredentials } from "./credentials";
test("customer master selection survives filtering and GPT is reachable from the overview", async ({
  page,
}) => {
  const credentials = browserCredentials();
  await page.goto("/");
  await page.getByLabel("E-Mail", { exact: true }).fill(credentials.email);
  await page.getByLabel("Passwort", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: /Sicher anmelden/ }).click();
  await page.route("**/api/customers/state", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/customers/masterlist", (route) =>
    route.fulfill({
      json: [
        {
          id: "a",
          organisation: "Alpha AG",
          firstName: "Anna",
          lastName: "Muster",
          email: "anna@example.test",
          website: "https://example.test",
          existing: false,
        },
        {
          id: "b",
          organisation: "Beta AG",
          firstName: "Bea",
          lastName: "Muster",
          email: "bea@example.test",
          website: "",
          existing: false,
        },
        {
          id: "c",
          organisation: "Existing AG",
          firstName: "Eva",
          lastName: "Muster",
          email: "eva@example.test",
          website: "",
          existing: true,
        },
      ],
    }),
  );
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Kunden/ })
    .click();
  await page
    .getByRole("button", { name: "Aus Masterliste importieren", exact: true })
    .click();
  const panel = page.getByRole("region", {
    name: "Kunden aus Masterliste importieren",
  });
  await panel.getByRole("checkbox", { name: /Alpha AG/ }).check();
  await panel.getByLabel("Masterliste durchsuchen").fill("Beta");
  await panel.getByRole("checkbox", { name: /Beta AG/ }).check();
  await expect(
    panel.getByRole("button", { name: "2 Kontakte als Kunden übernehmen" }),
  ).toBeEnabled();
  await panel.getByLabel("Masterliste durchsuchen").fill("");
  await expect(
    panel.getByRole("checkbox", { name: /Existing AG/ }),
  ).toBeDisabled();
  for (const width of [1440, 820, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(
    (
      await new AxeBuilder({ page })
        .include('[aria-label="Kunden aus Masterliste importieren"]')
        .analyze()
    ).violations,
  ).toEqual([]);
  let writes = 0;
  await page.route("**/api/customers/import", async (route) => {
    writes++;
    expect(route.request().postDataJSON()).toEqual({ contactIds: ["a", "b"] });
    await route.fulfill({ json: { created: 2, skipped: 0 } });
  });
  await panel
    .getByRole("button", { name: "2 Kontakte als Kunden übernehmen" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "2 Kundenprofile importiert",
  );
  expect(writes).toBe(1);
  await expect(panel).toHaveCount(0);
  await page
    .getByRole("button", { name: "GPT-Assistent", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "GPT-Unterstützung" }),
  ).toBeVisible();
  await page.getByLabel("Firma / Kundenname").fill("My draft");
  await page
    .getByRole("button", { name: "GPT-Assistent", exact: true })
    .click();
  await expect(page.getByLabel("Firma / Kundenname")).toHaveValue("My draft");
});
