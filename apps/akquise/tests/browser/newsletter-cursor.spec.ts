import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";

test("Newsletter-Cursor zeigt einen klaren Status und keine zweite Aufgabe", async ({
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
            tasks: [],
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
  const panel = page.getByRole("region", {
    name: "Newsletter an Cursor übergeben",
  });
  await expect(
    panel.getByRole("button", { name: "Mit Cursor umsetzen" }),
  ).toBeDisabled();
  await expect(panel.getByText("Cursor noch nicht verbunden.")).toBeVisible();
  await expect(panel.getByText("Status: Noch nicht gesendet")).toBeVisible();
  await expect(
    panel.getByText("Vorschau bereit ist noch keine Freigabe."),
  ).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Mit Cursor umsetzen" }),
  ).toHaveCount(1);
  const entry = page.getByRole("region", { name: "GPT für Newsletter" });
  await expect(
    entry.getByRole("button", { name: "GPT beauftragen" }),
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
