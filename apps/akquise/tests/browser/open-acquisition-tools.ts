import { expect, type Page } from "@playwright/test";

export async function openAcquisitionTools(
  page: Page,
  section?: "Kontakte" | "Mails" | "Versand",
) {
  if (section === "Mails") {
    await page.getByRole("button", { name: "Einstellungen", exact: true }).click();
    await page.getByRole("button", { name: "Mail-Studio verwalten", exact: true }).click();
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
