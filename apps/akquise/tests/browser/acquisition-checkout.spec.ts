import { checkout } from "./mail-checkout-helper";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { setup } from "./mail-assistant-fixture";

for (const width of [390, 1024, 1440]) {
  test(`simple selection, preview and explicit checkout at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 960 });
    await setup(page);
    const nav = page.getByRole("navigation", { name: "Akquise-Navigation" });
    await expect(nav.getByRole("button")).toHaveText([
      "Kontakte",
      "Mails",
      "Versand",
    ]);
    await expect(
      page.getByText("Zeitplan, Warteschlange und Verlauf"),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "3 ungesendete Mails" }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Gespeicherte Entwürfe öffnen (3)",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("region", { name: "Versandfreigabe" }),
    ).toHaveCount(0);
    const recipients = page.getByRole("navigation", { name: "Mail-Empfänger" });
    await recipients.getByRole("button", { name: /Atelier 1/ }).click();
    await expect(
      page
        .locator(".mail-preview-pane")
        .getByRole("heading", { name: "Anfrage 1" }),
    ).toBeVisible();
    if (width <= 1200) {
      await expect(recipients).toBeHidden();
      await page
        .getByRole("button", { name: "Zurück zur Liste", exact: true })
        .click();
    }
    await page.getByLabel("anna0@example.test für Versand auswählen").uncheck();
    await page.getByRole("button", { name: "Weiter zum Versand →" }).click();
    await expect(recipients).toBeHidden();
    await checkout(page);
    await expect(
      page.getByText("2 ausgewählte Kontakte", { exact: true }),
    ).toBeVisible();
    const plan = page.getByRole("button", {
      name: "2 Mails einplanen",
      exact: true,
    });
    await expect(plan).toBeDisabled();
    let calls = 0;
    await checkout(page);
    await page.route("**/api/mail-review/approve-and-enqueue", (route) => {
      calls++;
      const body = route.request().postDataJSON();
      expect(body.items.map((i: { id: string }) => i.id)).toEqual(["d1", "d2"]);
      expect(body.confirmDispatch).toBe(true);
      expect(body.read).toBe(true);
      return route.fulfill({
        json: {
          results: body.items.map((i: { id: string }) => ({
            id: i.id,
            ok: true,
            message: "Eingeplant",
          })),
        },
      });
    });
    await page.getByLabel(/Ich gebe die 2 ausgewählten/).check();
    await expect(plan).toBeEnabled();
    await page.getByRole("button", { name: "Zurück zu den Mails" }).click();
    await page.getByRole("button", { name: "Weiter zum Versand →" }).click();
    await expect(
      page.getByLabel(/Ich gebe die 2 ausgewählten/),
    ).not.toBeChecked();
    await expect(plan).toBeDisabled();
    expect(calls).toBe(0);
    expect(
      (await new AxeBuilder({ page }).include(".mail-studio").analyze())
        .violations,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await checkout(page);
    await page.screenshot({
      path: `.local/acquisition-checkout-${width}.png`,
      fullPage: true,
    });
    await page.getByLabel(/Ich gebe die 2 ausgewählten/).check();
    await plan.click();
    await expect(
      page.getByRole("button", { name: "Versand verfolgen" }),
    ).toBeVisible();
    expect(calls).toBe(1);
    await page.getByRole("button", { name: "Versand verfolgen" }).click();
    await expect(
      page.getByRole("heading", { name: "Versand", exact: true }),
    ).toBeVisible();
  });
}
