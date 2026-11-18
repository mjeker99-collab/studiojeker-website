import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { browserCredentials } from "./credentials";
import { mkdirSync } from "node:fs";
test("Content chat is accessible on iPad and phone and disabled without provider", async ({
  page,
}) => {
  const c = browserCredentials();
  await page.goto("/");
  await page.getByLabel("E-Mail", { exact: true }).fill(c.email);
  await page.getByLabel("Passwort", { exact: true }).fill(c.password);
  await page.getByRole("button", { name: /Sicher anmelden/ }).click();
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Content Studio/ })
    .click();
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByLabel("Deine Nachricht", { exact: true }).fill("");
    await expect(
      page.getByRole("heading", { name: "Was möchtest du machen?" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Neues Briefing", exact: true }),
    ).not.toBeVisible();
    await expect(page.getByLabel("Auftrag", { exact: true })).not.toBeVisible();
    await expect(
      page.getByLabel("Bild hochladen (JPEG, PNG oder WebP, maximal 8 MB)"),
    ).not.toBeVisible();
    mkdirSync(".local/hub-screenshots", { recursive: true });
    await page.screenshot({
      path: `.local/hub-screenshots/studio-simple-${width}.png`,
      fullPage: true,
    });
    await page
      .getByLabel("Deine Nachricht", { exact: true })
      .fill("Ein animiertes Sujet");
    await expect(
      page.getByRole("button", { name: "An GPT senden", exact: true }),
    ).toBeDisabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page
    .getByText("Was GPT über dich und die Firma weiss", { exact: true })
    .click();
  await page
    .getByLabel("Was soll GPT über deine Rolle und Arbeitsweise wissen?", {
      exact: true,
    })
    .fill("SYNTHETISCH: Bitte kurze Erklärungen für das interne Testkonto.");
  await page
    .getByRole("button", { name: "Meine Vorgaben speichern", exact: true })
    .click();
  await expect(
    page.locator(".studio-knowledge").getByRole("status"),
  ).toContainText("Deine Vorgaben sind gespeichert");
  await page.reload();
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Content Studio/ })
    .click();
  await page
    .getByText("Was GPT über dich und die Firma weiss", { exact: true })
    .click();
  await expect(
    page.getByLabel("Was soll GPT über deine Rolle und Arbeitsweise wissen?", {
      exact: true,
    }),
  ).toHaveValue(
    "SYNTHETISCH: Bitte kurze Erklärungen für das interne Testkonto.",
  );
  const scan = await new AxeBuilder({ page }).include(".studio-chat").analyze();
  expect(scan.violations).toEqual([]);
});


test("24-post brief previews four series and drafts without providers or publication", async ({ page }) => {
  const c = browserCredentials();
  const prepared: { requestKey: string; items: { count: number; channels: string[]; topic: string; workspace: string }[] }[] = [];
  const forbidden: string[] = [];
  const savedSeries = ["synthetic-series-1", "synthetic-series-2", "synthetic-series-3", "synthetic-series-4"];
  await page.route("**/api/studio/series/batch", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const payload = route.request().postDataJSON();
    prepared.push(payload);
    // Simulate a lost response after the first atomic commit. A retry with
    // the same key must return the same four series, not create new ones.
    if (prepared.length === 1) {
      await route.fulfill({ status: 503, json: { error: "Antwort nach Speicherung unterbrochen." } });
      return;
    }
    await route.fulfill({
      json: {
        series: savedSeries.map((id) => ({ id })),
        replayed: true,
      },
    });
  });
  for (const pattern of ["**/api/studio/jobs", "**/api/studio/run/**", "**/api/hub/promote-social/**"]) {
    await page.route(pattern, async (route) => {
      forbidden.push(route.request().url());
      await route.fulfill({ status: 409, json: { error: "External action forbidden in synthetic preview test" } });
    });
  }
  await page.goto("/");
  await page.getByLabel("E-Mail", { exact: true }).fill(c.email);
  await page.getByLabel("Passwort", { exact: true }).fill(c.password);
  await page.getByRole("button", { name: /Sicher anmelden/ }).click();
  await page.getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Content Studio/ }).click();
  const original = "Ich möchte weitere social media posts erstellen lassen zu den 4 servicebereichen, analog zu den bisherigen posts. Wir benötigen pro servicebereich je 6 posts für fFb/Insta und linkedin";
  await page.getByLabel("Deine Nachricht", { exact: true }).fill(original);
  await expect(page.getByText(/4 Bereiche mit je 6 Beiträgen/)).toBeVisible();
  await expect(page.getByRole("button", { name: "24 Beitragsentwürfe vorbereiten" })).toBeEnabled();
  const createButton = page.getByRole("button", { name: "24 Beitragsentwürfe vorbereiten" });
  await createButton.click();
  await expect(page.getByText(/derselben Kennung sicher erneut geprüft/)).toBeVisible();
  await createButton.click();
  await expect.poll(() => prepared.length).toBe(2);
  expect(prepared[0].requestKey).toMatch(/^[0-9a-f-]{36}$/i);
  expect(prepared[1].requestKey).toBe(prepared[0].requestKey);
  expect(prepared[0].items).toHaveLength(4);
  expect(prepared[0].items.map((item) => item.count)).toEqual([6, 6, 6, 6]);
  for (const item of prepared[0].items) {
    expect(item.channels).toEqual(["FACEBOOK", "INSTAGRAM", "LINKEDIN"]);
    expect(item.workspace).toBe("CONTENT_DRAFT");
    expect(item.topic).toBe(original);
  }
  expect(forbidden).toEqual([]);
  await expect(page.getByText(/4 Serien mit 24 Beitragsentwürfen/)).toBeVisible();
});
