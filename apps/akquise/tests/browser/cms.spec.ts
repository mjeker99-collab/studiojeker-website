import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("Website CMS overview and newsletter editing without Sanity administration", async ({
  page,
}) => {
  let imported = false;
  let failed = false;
  let cmsRequests = 0;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/mailchimp/templates")
      return route.fulfill({ json: { connected: false, templates: [] } });
    if (path === "/api/studio/state")
      return route.fulfill({ json: { campaigns: [], series: [] } });
    if (path === "/api/state")
      return route.fulfill({
        json: {
          user: { id: "synthetic", name: "Martin Jeker" },
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
    if (path === "/api/hub/state")
      return route.fulfill({
        json: {
          campaigns: [],
          contents: [],
          users: [],
          drafts: [],
          customers: [],
          integrations: {},
        },
      });
    if (path === "/api/websites") return route.fulfill({json:{projects:[],customers:[],config:{connected:false,reserveUsd:0.3}}});
    if (path === "/api/cms/state") {
      cmsRequests++;
      return route.fulfill(
        failed
          ? {
              status: 502,
              json: { error: "Sanity ist nicht erreichbar." },
            }
          : {
              json: {
                studioUrl: "https://studiojeker.sanity.studio/structure",
                documents: [
                  {
                    _id: "synthetic",
                    _rev: "rev1",
                    title: "Synthetische Ausgabe",
                    subject: "Test",
                    _updatedAt: "2026-10-18T12:00:00Z",
                  },
                ],
              },
            },
      );
    }
    if (path === "/api/cms/import") {
      expect(route.request().postDataJSON()).toEqual({
        id: "synthetic",
        revision: "rev1",
      });
      const result = { imported: !imported };
      imported = true;
      return route.fulfill({ json: result });
    }
    return route.fulfill({ json: {} });
  });
  await page.route("**/api/site-cms/overview", async (route) =>
    route.fulfill({
      json: {
        studioUrl: "https://studiojeker.sanity.studio/structure",
        stagingUrl: "https://staging2026.studiojeker.ch",
        liveUrl: "https://www.studiojeker.ch",
        publishAllowed: false,
        writeConfigured: false,
        pages: [
          {
            key: "homepage",
            title: "Homepage",
            path: "/",
            exists: true,
            hasDraft: false,
            source: "published",
            updatedAt: "2026-10-25T12:00:00Z",
            stagingUrl: "https://staging2026.studiojeker.ch/",
            liveUrl: "https://www.studiojeker.ch/",
            studioUrl: "https://studiojeker.sanity.studio/structure/homepage",
          },
        ],
      },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Website/ })
    .click();
  const areas = page.getByRole("navigation", { name: "Website-Bereiche" });
  await expect(
    areas.getByRole("button", { name: "Bestehende Website verwalten" }),
  ).toBeVisible();
  await expect(
    areas.getByRole("button", {
      name: "Neue Website / Landingpage erstellen",
    }),
  ).toBeVisible();
  const website = page.getByRole("region", { name: "Bestehende Website" });
  await expect(
    website.getByRole("heading", { name: "Bestehende Website verwalten" }),
  ).toBeVisible();
  await expect(
    website.getByRole("link", { name: "Sanity Studio öffnen ↗" }),
  ).toHaveAttribute("target", "_blank");
  await expect(
    website.getByRole("button", { name: "Bearbeiten" }),
  ).toBeVisible();
  await expect(
    website.getByRole("button", { name: "Als neuen Entwurf übernehmen" }),
  ).toHaveCount(0);
  expect(cmsRequests).toBe(0);
  expect(
    (await new AxeBuilder({ page }).include(".site-cms").analyze()).violations,
  ).toEqual([]);
  await areas
    .getByRole("button", { name: "Neue Website / Landingpage erstellen" })
    .click();
  await expect(
    page.getByRole("region", { name: "Website-Studio", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Newsletter/ })
    .click();
  // The newsletter is edited in StudioONE; Sanity administration was removed
  // from this area. Keep the Website/Sanity provider stub to detect regressions.
  await expect(page.getByRole("region", { name: "Sanity-Verwaltung" })).toHaveCount(0);
  const panel = page.getByRole("region", { name: "Newsletter-Vorlage auswählen" });
  await expect(panel.getByRole("heading", { name: "Newsletter bearbeiten" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Grundvorlage bearbeiten" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Letzte gespeicherte Version bearbeiten" })).toBeDisabled();
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    expect(
      (await new AxeBuilder({ page }).include('[aria-label="Newsletter-Vorlage auswählen"]').analyze()).violations,
    ).toEqual([]);
  }
  await panel.getByRole("button", { name: "Vorlage ansehen" }).click();
  await expect(panel.getByRole("button", { name: "Vorschau schliessen" })).toBeVisible();
  expect(cmsRequests).toBe(0);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: ".local/cms-desktop.png", fullPage: true });
});
