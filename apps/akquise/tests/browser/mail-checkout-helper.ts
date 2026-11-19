import type { Page } from "@playwright/test";
export async function checkout(page: Page) {
  if (await page.getByRole("region", { name: "Versandfreigabe" }).isVisible())
    return;
  await page
    .getByRole("button", { name: "Weiter zum Versand →", exact: true })
    .click();
}
