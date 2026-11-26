import { expect, type Page } from "@playwright/test";

export async function openAcquisitionTools(
  page: Page,
  section?: "Kontakte" | "Mails" | "Versand",
) {
  if (section === "Mails") {
    // These mail tests have no connected social or GPT account.
    const integrations = /\/api\/(social\/status|integrations\/gpt\/status)$/;
    await page.route(integrations, (route) => route.fulfill({
      status: 503, json: { error: "Im isolierten Mailtest nicht verbunden." },
    }));
    await page.getByRole("button", { name: "Einstellungen", exact: true }).click();
    await page.getByRole("button", { name: "Mail-Studio verwalten", exact: true }).click();
    await page.unroute(integrations);
    return;
  }
  const nav = page.getByRole("navigation", { name: "Akquise-Navigation" });
  await expect(nav).toBeVisible();
  if (section) {
    await nav.getByRole("button", {
      name: section === "Versand" ? "Versandverlauf" : section,
      exact: true,
    }).click();
  }
}
