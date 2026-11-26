import type { Page } from "@playwright/test";

export async function openAcquisitionTools(
  page: Page,
  section?: "Kontakte" | "Mails" | "Versand",
) {
  const nav = page.getByRole("navigation", { name: "Akquise-Navigation" });
  if (!(await nav.isVisible()))
    await page.getByText("Kontakte, Recherche und Verlauf", { exact: true }).click();
  if (section) await nav.getByRole("button", { name: section, exact: true }).click();
}
