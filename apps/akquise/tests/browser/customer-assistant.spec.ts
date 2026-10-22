import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { browserCredentials } from "./credentials";
import { emptyKnowledge } from "../../lib/customer-knowledge";

test("GPT customer assistant previews sourced fields, preserves manual text and resets between customers", async ({
  page,
}) => {
  const credentials = browserCredentials();
  await page.goto("/");
  await page.getByLabel("E-Mail", { exact: true }).fill(credentials.email);
  await page.getByLabel("Passwort", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: /Sicher anmelden/ }).click();
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Kunden/ })
    .click();
  await page.getByRole("button", { name: /Kunde erfassen/ }).click();
  const research = page.getByRole("button", {
    name: "Mit GPT recherchieren & ausfüllen",
    exact: true,
  });
  await expect(research).toBeDisabled();
  await page.getByLabel("Firma / Kundenname").fill("Example AG");
  await page
    .getByLabel("Website (HTTPS)", { exact: true })
    .fill("www.example.com");
  await page
    .getByLabel("Angebote & Leistungen", { exact: true })
    .fill("Meine eigenen Leistungen");
  await page.getByLabel("Interne Notizen").fill("Interne vertrauliche Notiz");
  await expect(page.getByLabel("Website (HTTPS)", { exact: true })).toHaveValue(
    "https://www.example.com",
  );
  let calls = 0;
  let writes = 0;
  await page.route("**/api/customers", async (route) => {
    writes++;
    await route.continue();
  });
  await page.route("**/api/customers/assist", async (route) => {
    calls++;
    const data = route.request().postDataJSON();
    expect(data.name).toBe("Example AG");
    expect(data.mode).toBe("RESEARCH");
    expect(data.notes).toBeUndefined();
    expect(data.contactEmail).toBeUndefined();
    await route.fulfill({
      json: {
        knowledge: {
          ...emptyKnowledge,
          company: "Geprüfte Firma.\nQuellen: https://www.example.com/about",
          offers: "Neue Leistungen",
        },
        citations: [{ field: "company", url: "https://www.example.com/about" }],
        sources: [
          { url: "https://www.example.com/about", title: "Example – Über uns" },
        ],
        questions: ["Welche Bildsprache ist freigegeben?"],
        researchedAt: new Date().toISOString(),
        mode: "RESEARCH",
      },
    });
  });
  await research.click();
  await expect(
    page.getByRole("heading", { name: "Vorschläge prüfen" }),
  ).toBeVisible();
  expect(calls).toBe(1);
  expect(writes).toBe(0);
  await expect(
    page.getByLabel("Unternehmen & Markt", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("link", { name: /Quelle: Example/ }),
  ).toHaveAttribute("href", "https://www.example.com/about");
  await page
    .getByRole("button", { name: "Alle leeren Felder ergänzen" })
    .click();
  await expect(
    page.getByLabel("Unternehmen & Markt", { exact: true }),
  ).toHaveValue(/Geprüfte Firma/);
  await expect(
    page.getByLabel("Angebote & Leistungen", { exact: true }),
  ).toHaveValue("Meine eigenen Leistungen");
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
  await page
    .getByRole("button", { name: "Angebote & Leistungen: Text ersetzen" })
    .click();
  await expect(
    page.getByLabel("Angebote & Leistungen", { exact: true }),
  ).toHaveValue("Neue Leistungen");
  await page.getByRole("button", { name: "Schliessen", exact: true }).click();
  await page.getByRole("button", { name: /Kunde erfassen/ }).click();
  await expect(
    page.getByRole("heading", { name: "Vorschläge prüfen" }),
  ).toHaveCount(0);
  await page.getByLabel("Firma / Kundenname").fill("Example AG");
  await page
    .getByLabel("Website (HTTPS)", { exact: true })
    .fill("https://www.example.com");
  await page.unroute("**/api/customers/assist");
  await page.route("**/api/customers/assist", (route) =>
    route.fulfill({ status: 503, json: { error: "GPT ist nicht verbunden." } }),
  );
  await research.click();
  await expect(page.getByRole("alert")).toHaveText("GPT ist nicht verbunden.");
  await expect(
    page.getByLabel("Unternehmen & Markt", { exact: true }),
  ).toHaveValue("");
});
