import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";

test("Newsletter-Auftrag nutzt ein Feld und zeigt den nächsten Schritt", async ({
  page,
}) => {
  const writes: string[] = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== "GET") writes.push(path);
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
    if (path === "/api/hub/state")
      return route.fulfill({
        json: {
          campaigns: [],
          contents: [],
          users: [{ id: "synthetic", name: "Testperson" }],
          drafts: [],
          customers: [],
          integrations: {
            mailchimp: "NOT_CONNECTED",
            linkedin: "NOT_CONNECTED",
            instagram: "NOT_CONNECTED",
            facebook: "NOT_CONNECTED",
          },
          newsletterCursor: {
            connected: false,
            nextStep: "Neue Ausgabe anlegen",
            tasks: [],
            editions: [],
            handoffs: [],
          },
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
            textReserve: 0,
            imageReserve: 0,
          },
        },
      });
    if (path === "/api/mailchimp/templates")
      return route.fulfill({ json: { connected: false, templates: [] } });
    if (path === "/api/hub/mailchimp/audiences")
      return route.fulfill({ json: { connected: false, audiences: [] } });
    return route.fulfill({ json: {} });
  });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Newsletter/ })
    .click();
  const entry = page.getByRole("region", { name: "GPT für Newsletter" });
  const panel = entry.getByRole("region", { name: "Newsletter-Auftrag" });
  await expect(
    panel.getByRole("button", { name: "Neue Ausgabe anlegen" }),
  ).toBeVisible();
  await expect(panel.locator("textarea")).toHaveCount(0);
  await expect(entry.getByLabel("Dein Auftrag")).toBeVisible();
  await expect(entry.locator("textarea")).toHaveCount(1);
  await expect(
    panel.getByText("Cursor ist noch nicht verbunden."),
  ).toBeVisible();
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  for (const width of [700, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/opt/cursor/artifacts/newsletter-cursor-${width}.png`,
      fullPage: true,
    });
  }
  expect(
    (await new AxeBuilder({ page }).include(".newsletter-cursor").analyze())
      .violations,
  ).toEqual([]);
  expect(writes).toEqual([]);
});
