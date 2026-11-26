import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const [width, height] of [
  [1440, 1000],
  [1024, 768],
  [768, 1024],
  [390, 844],
]) {
  test(`simple overview and navigation ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const writes: string[] = [];
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (route.request().method() !== "GET") writes.push(path);
      if (path === "/api/state")
        return route.fulfill({
          json: {
            user: { id: "synthetic", name: "Testperson" },
            users: [],
            contacts: [],
            drafts: [],
            deliveries: [],
            suppressions: [],
            audits: [],
            generator: "disabled",
            externalSending: false,
            mailMode: "disabled",
          },
        });
      if (path === "/api/dashboard")
        return route.fulfill({
          json: {
            projects: [
              {
                id: "sample",
                title: "Beispiel: Sichtbarkeit im Dezember",
                kind: "Kampagne",
                section: "Kampagnen",
                date: "2026-11-26T08:00:00Z",
                dateLabel: "Bearbeitet",
              },
            ],
          },
        });
      if (path === "/api/hub/state")
        return route.fulfill({
          json: {
            campaigns: [],
            contents: [],
            users: [],
            drafts: [],
            customers: [],
            integrations: {},
            events: [],
          },
        });
      if (path === "/api/studio/state")
        return route.fulfill({
          json: {
            series: [],
            jobs: [],
            assets: [],
            campaigns: [],
            customers: [],
            organization: { name: "Testfirma" },
            config: {
              connected: false,
              storage: "DISCONNECTED",
              textReserve: 0.1,
              imageReserve: 0.5,
              dailyRequests: 3,
              dailyBudget: 5,
            },
          },
        });
      if (path === "/api/project-drafts") return route.fulfill({ json: [] });
      return route.fulfill({
        status: 503,
        json: { error: "Beispielvorschau: keine Verbindung" },
      });
    });
    await page.goto("/");
    const nav = page.getByRole("navigation", {
      name: "Hauptnavigation",
      exact: true,
    });
    await expect(nav.getByRole("button")).toHaveText([
      "Übersicht",
      "Akquise",
      "Inhalte",
      "Projekte",
      "Bibliothek",
      "Kalender",
    ]);
    await expect(
      page.getByRole("button", {
        name: "Projekt weiterbearbeiten",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.locator(".dashboard-home button:not(.secondary):visible"),
    ).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const axe = await new AxeBuilder({ page })
      .include(".dashboard-home")
      .analyze();
    expect(axe.violations).toEqual([]);
    await page.screenshot({
      path: `docs/screenshots/v1-simple-${width}.png`,
      fullPage: true,
    });
    await page.getByText("Weitere Projekte finden", { exact: true }).click();
    await expect(
      page.getByLabel("Projekt suchen", { exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("Projekt suchen", { exact: true })
      .fill("nicht vorhanden");
    await expect(
      page.getByText("Keine Projekte für diese Auswahl gefunden."),
    ).toBeVisible();
    await nav.getByRole("button", { name: "Inhalte", exact: true }).click();
    const contents = page.getByRole("navigation", {
      name: "Inhalte-Navigation",
      exact: true,
    });
    await expect(contents.getByRole("button")).toHaveText([
      "Bilder, Videos & Texte",
      "Newsletter",
      "Social Media",
      "Website",
    ]);
    await contents
      .getByRole("button", { name: "Newsletter", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Newsletter", level: 1, exact: true }),
    ).toBeVisible();
    await nav.getByRole("button", { name: "Übersicht", exact: true }).click();
    await nav.getByRole("button", { name: "Inhalte", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Newsletter", level: 1, exact: true }),
    ).toBeVisible();
    await nav.getByRole("button", { name: "Projekte", exact: true }).click();
    await expect(
      page
        .getByRole("navigation", { name: "Projekte-Navigation", exact: true })
        .getByRole("button"),
    ).toHaveText(["Kampagnen", "Konzepte", "Kunden"]);
    await nav.getByRole("button", { name: "Übersicht", exact: true }).click();
    await page.getByRole("button", { name: /Neue Kunden gewinnen/ }).click();
    await expect(
      page.getByRole("heading", {
        name: "Mails vorbereiten",
        level: 1,
        exact: true,
      }),
    ).toBeVisible();
    expect(writes).toEqual([]);
  });
}
