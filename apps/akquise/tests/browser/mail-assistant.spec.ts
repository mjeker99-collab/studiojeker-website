import { test, expect } from "@playwright/test";
import { setup } from "./mail-assistant-fixture";
for (const width of [390, 1024])
  test(`research, shared filters and personalized text at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await setup(page, { queued: false });
    let generated = 0;
    let imported = 0;
    const lead = {
      organisation: "Neu AG",
      firstName: "Anna",
      lastName: "Neu",
      email: "anna@new.example",
      industry: "Bau",
      region: "Bern",
      position: "Leitung",
      website: "https://new.example",
      sourceUrl: "https://new.example/team",
      hook: "Wohnbauten in Bern",
      service: "Fotografie",
    };
    await page.route("**/api/mail-assistant/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      const body =
        route.request().method() === "POST"
          ? route.request().postDataJSON()
          : {};
      if (path.endsWith("history")) return route.fulfill({ json: [] });
      if (path.endsWith("generate")) {
        generated++;
        return route.fulfill({
          json: {
            id: body.mode === "RESEARCH" ? "research" : "write",
            result: {
              leads: body.mode === "RESEARCH" ? [lead] : [],
              mails: [],
              note: "",
            },
          },
        });
      }
      imported++;
      return route.fulfill({
        json:
          body.id === "research"
            ? { imported: 1, duplicates: 0 }
            : {
                results: [
                  { id: "d0", ok: true },
                  { id: "d1", ok: true },
                  { id: "d2", ok: true },
                ],
              },
      });
    });
    await page.getByRole("button", { name: "1 · Kontakte finden", exact: true }).click();
    await page
      .getByLabel("Wen möchtest du erreichen und was anbieten?")
      .fill("Architekturbüros für Visualisierungen finden");
    await page.getByLabel("Region", { exact: true }).fill("Bern");
    await page
      .getByRole("button", { name: "Kontakte recherchieren", exact: true })
      .click();
    await expect(
      page.getByRole("link", { name: "Quelle öffnen" }),
    ).toHaveAttribute("href", lead.sourceUrl);
    await page
      .getByRole("button", { name: "1 ausgewählte Kontakte übernehmen" })
      .click();
    await expect(page.getByText(/1 neue Kontakte übernommen/)).toBeVisible();
    await page.getByRole("button", { name: "3 · Mails erstellen & versenden", exact: true }).click();
    await page.getByText("Nach Unternehmen oder Branche filtern", { exact: true }).click();
    await page
      .getByRole("combobox", { name: "Kunde / Unternehmen", exact: true })
      .selectOption({ index: 1 });
    await expect(page.getByText(/1 Kontakte mit E-Mail-Adresse/)).toBeVisible();
    await page
      .getByRole("button", { name: "Filter zurücksetzen", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Gespeicherte Entwürfe öffnen (3)", exact: true })
      .click();

    await page
      .getByLabel("Was möchtest du diesen Kontakten anbieten?")
      .fill("Businessfotografie für ihre nächste Kampagne anbieten.");
    await page
      .getByRole("button", {
        name: "3 Mailtexte persönlich formulieren",
        exact: true,
      })
      .click();
    await expect(
      page.getByText(/3 persönliche Mailtexte gespeichert/),
    ).toBeVisible();
    expect(generated).toBe(2);
    expect(imported).toBe(2);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.local/mail-assistant-${width}.png`,
      fullPage: true,
    });
  });
