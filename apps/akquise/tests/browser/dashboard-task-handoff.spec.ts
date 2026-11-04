import { test, expect } from "@playwright/test";

test("Dashboard keeps the original Content Studio and Newsletter requests in GPT without submitting", async ({ page }) => {
  const writes: string[] = [];
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() !== "GET") writes.push(path);
    if (path === "/api/state") return route.fulfill({ json: {
      user: { id: "synthetic", name: "Testperson" }, users: [], contacts: [],
      drafts: [], deliveries: [], suppressions: [], audits: [],
      generator: "disabled", externalSending: false, mailMode: "disabled",
    } });
    if (path === "/api/dashboard") return route.fulfill({ json: {
      projects: [], updatedAt: "2026-11-02T00:00:00.000Z",
    } });
    if (path === "/api/hub/state") return route.fulfill({ json: {
      campaigns: [], contents: [], users: [], drafts: [], customers: [],
      integrations: {}, events: [],
    } });
    if (path === "/api/studio/state") return route.fulfill({ json: {
      series: [], jobs: [], assets: [], campaigns: [], customers: [],
      organization: { name: "Testfirma" }, config: {
        connected: true, storage: "DISCONNECTED", textReserve: 0.1,
        imageReserve: 0.5, dailyRequests: 3, dailyBudget: 5,
      },
    } });
    if (path === "/api/project-drafts") return route.fulfill({ json: [] });
    return route.fulfill({ status: 503, json: { error: "Not used" } });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Was möchtest du heute erledigen?" })).toBeVisible();
  const prompt = "Bitte drei Bildideen für unser Herbstangebot vorbereiten";
  await page.getByLabel("Deine Aufgabe", { exact: true }).fill(prompt);
  await page.getByRole("button", { name: /Aufgabe starten/ }).click();
  await expect(page.getByRole("region", { name: "Aufgaben im Content-Studio" })).toBeVisible();
  await expect(page.getByLabel("Deine Nachricht", { exact: true })).toHaveValue(prompt);

  await page.getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: "Übersicht", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Was möchtest du heute erledigen?" })).toBeVisible();
  const newsletterPrompt = "Bitte einen Newsletter zu unserem neuen Herbstangebot vorbereiten";
  await page.getByLabel("Deine Aufgabe", { exact: true }).fill(newsletterPrompt);
  await page.getByRole("button", { name: /Aufgabe starten/ }).click();
  const entry = page.getByRole("region", { name: "GPT für Newsletter" });
  await expect(entry.getByLabel("Deine Nachricht", { exact: true })).toHaveValue(newsletterPrompt);
  expect(writes).toEqual([]);
});
