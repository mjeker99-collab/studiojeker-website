import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("find an unassigned campaign project, reopen its GPT history and save its association", async ({
  page,
}) => {
  const writes: { path: string; body: Record<string, unknown> }[] = [];
  const campaign = {
    id: "campaign",
    title: "Visibility Abo",
    customerId: "customer",
    goal: "Sichtbarkeit",
    audience: "KMU",
    startsAt: "2026-10-24T10:00:00Z",
    endsAt: "2026-11-30T10:00:00Z",
    ownerId: "user",
    revision: 1,
    _count: { contents: 0, drafts: 0 },
  };
  const series = {
    id: "series",
    title: "Promoten der neuen Visibility Abos",
    customerId: null as string | null,
    briefing: { campaignId: null as string | null },
    contents: [],
  };
  const savedJob = {
    id: "job",
    seriesId: "series",
    kind: "CHAT",
    status: "SUCCEEDED",
    createdAt: "2026-10-24T10:00:00Z",
    input: { request: { message: "Plane meine Kampagne" } },
    result: { reply: "Dein gespeicherter Kampagnenplan mit sechs Sujets" },
  };
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    if (req.method() !== "GET") {
      const body = req.postDataJSON();
      writes.push({ path, body });
      if (path === "/api/studio/series/series/assignment") {
        series.title = body.title;
        series.customerId = body.customerId;
        series.briefing.campaignId = body.campaignId;
        return route.fulfill({ json: { id: "series" } });
      }
      return route.fulfill({
        status: 400,
        json: { error: "Unexpected mutation" },
      });
    }
    if (path === "/api/state")
      return route.fulfill({
        json: {
          user: { id: "user", name: "Testperson" },
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
          campaigns: [campaign],
          contents: [],
          drafts: [],
          customers: [{ id: "customer", name: "Studiojeker GmbH" }],
          users: [],
          integrations: {},
          events: [],
        },
      });
    if (path === "/api/studio/state")
      return route.fulfill({
        json: {
          series: [series],
          jobs: url.searchParams.has("seriesId") ? [savedJob] : [],
          assets: [],
          campaigns: [campaign],
          customers: [{ id: "customer", name: "Studiojeker GmbH" }],
          organization: { name: "Studiojeker" },
          config: {
            connected: true,
            storage: "DISCONNECTED",
            textReserve: 0.1,
            imageReserve: 0.5,
          },
        },
      });
    return route.fulfill({ json: { connections: [], configured: {} } });
  });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Kampagnen/ })
    .click();
  await page
    .getByRole("button", { name: "Mit GPT weiterarbeiten", exact: true })
    .click();
  const entry = page.getByRole("region", { name: "GPT für Kampagnen" });
  await expect(entry.getByLabel("Kampagne für GPT")).toHaveValue("campaign");
  await entry.getByLabel("Gespeichertes Projekt suchen").fill("Visibility");
  await expect(entry.getByLabel("Gespeichertes GPT-Projekt")).toContainText(
    "Noch ohne Kampagne",
  );
  await entry.getByLabel("Gespeichertes GPT-Projekt").selectOption("series");
  await entry
    .getByRole("button", { name: "Projekt und GPT-Verlauf öffnen" })
    .click();
  await expect(entry.getByRole("log")).toContainText(savedJob.result.reply);
  await expect(
    entry.getByLabel("Deine Nachricht", { exact: true }),
  ).toHaveValue("");
  await entry
    .getByRole("button", { name: "Projektname und Zuordnung ändern" })
    .click();
  await entry
    .getByLabel("Projektname", { exact: true })
    .fill("Visibility Abo · Kampagnenplanung");
  await entry.getByLabel("Für welche Firma?").selectOption("customer");
  await entry
    .getByRole("combobox", { name: "Kampagne", exact: true })
    .selectOption("campaign");
  await entry.getByRole("button", { name: "Zuordnung sichern" }).click();
  await expect(entry.getByRole("status")).toContainText(
    "Zuordnung gespeichert",
  );
  await expect(entry.getByRole("log")).toContainText(savedJob.result.reply);
  expect(writes).toHaveLength(1);
  expect(writes[0].body).toMatchObject({
    customerId: "customer",
    campaignId: "campaign",
    expectedCustomerId: null,
    expectedCampaignId: null,
  });
  for (const width of [390, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (await new AxeBuilder({ page }).include(".assistant-entry").analyze())
        .violations,
    ).toEqual([]);
  }
  await page.reload();
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Kampagnen/ })
    .click();
  await page.getByRole("button", { name: "Mit GPT weiterarbeiten", exact: true }).click();
  await expect(entry.getByLabel("Gespeichertes GPT-Projekt")).toHaveValue("series");
  await entry
    .getByRole("button", { name: "Projekt und GPT-Verlauf öffnen" })
    .click();
  await expect(entry.getByRole("log")).toContainText(savedJob.result.reply);
  await expect(entry.locator(".studio-chat-controls")).toContainText(
    "Visibility Abo · Kampagnenplanung",
  );
  expect(writes).toHaveLength(1);
});
