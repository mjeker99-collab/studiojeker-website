import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("CMS overview, responsive controls, import status and provider failure", async ({
  page,
}) => {
  let imported = false;
  let failed = false;
  let cmsRequests = 0;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
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
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Website/ })
    .click();
  const website = page.getByRole("region", { name: "Website-Verwaltung" });
  await expect(
    website.getByRole("heading", { name: "Website-Inhalte verwalten" }),
  ).toBeVisible();
  await expect(
    website.getByRole("link", { name: "Website bearbeiten ↗" }),
  ).toHaveAttribute("target", "_blank");
  await expect(
    website.getByRole("button", { name: "Als neuen Entwurf übernehmen" }),
  ).toHaveCount(0);
  expect(cmsRequests).toBe(0);
  expect(
    (await new AxeBuilder({ page }).include(".cms-panel").analyze()).violations,
  ).toEqual([]);
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Newsletter/ })
    .click();
  const panel = page.getByRole("region", { name: "Sanity-Verwaltung" });
  await expect(
    panel.getByRole("heading", { name: "Synthetische Ausgabe" }),
  ).toBeVisible();
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (await new AxeBuilder({ page }).include(".cms-panel").analyze())
        .violations,
    ).toEqual([]);
  }
  await panel
    .getByRole("button", { name: "Als neuen Entwurf übernehmen" })
    .click();
  await expect(panel.getByRole("status")).toContainText(
    "Als neuer Entwurf übernommen",
  );
  await panel
    .getByRole("button", { name: "Als neuen Entwurf übernehmen" })
    .click();
  await expect(panel.getByRole("status")).toContainText("bereits übernommen");
  await expect(
    panel.getByRole("link", { name: "Newsletter in Sanity bearbeiten ↗" }),
  ).toHaveAttribute("target", "_blank");
  failed = true;
  await panel
    .getByRole("button", { name: "Sanity-Liste aktualisieren" })
    .click();
  await expect(panel.getByRole("alert")).toContainText("nicht erreichbar");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: ".local/cms-desktop.png", fullPage: true });
});
