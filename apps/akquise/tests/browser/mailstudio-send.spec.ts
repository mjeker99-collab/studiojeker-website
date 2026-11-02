import { test, expect, type Page } from "@playwright/test";

async function setup(
  page: Page,
  options: { queued?: boolean; failure?: "review" | "unknown" } = {},
) {
  const sent: string[] = [];
  const previews: string[][] = [];
  const settingsCalls: Record<string, unknown>[] = [];
  const contacts = Array.from({ length: 3 }, (_, i) => ({
    id: `c${i}`,
    revision: 1,
    organisation: `Atelier ${i}`,
    firstName: "Anna",
    lastName: `Test${i}`,
    email: `anna${i}@example.test`,
    status: "NEW",
  }));
  const drafts = contacts.map((c, i) => ({
    id: `d${i}`,
    contactId: c.id,
    version: 1,
    versions: [
      {
        version: 1,
        subject: `Anfrage ${i}`,
        recipient: c.email,
        signatureCurrent: true,
      },
    ],
    approvals: [{ version: 1, status: "APPROVED" }],
  }));
  let schedule = {
    revision: 1,
    enabled: false,
    dailyLimit: 50,
    weekdaysOnly: true,
    startHour: 9,
    endHour: 17,
    intervalMinutes: 2,
    heartbeatAt: new Date().toISOString(),
    pauseReason: null,
  };
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body =
      route.request().method() === "POST" ? route.request().postDataJSON() : {};
    if (path === "/api/state")
      return route.fulfill({
        json: {
          user: { id: "test", name: "Test" },
          users: [],
          contacts,
          drafts,
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
          events: [],
        },
      });
    if (path === "/api/mail-schedule")
      return route.fulfill({
        json: {
          schedule,
          workerHealthy: true,
          productionReady: true,
          serverLimit: 100,
          todayCount: sent.length,
          todaySent: sent.length,
          counts: options.queued ? [{ status: "QUEUED", _count: 3 }] : [],
          items: options.queued
            ? drafts.map((d, i) => ({
                id: `q${i}`,
                draftId: d.id,
                version: 1,
                recipient: contacts[i].email,
                subject: `Anfrage ${i}`,
                status: "QUEUED",
                error: null,
              }))
            : [],
        },
      });
    if (path === "/api/mail-review/preview") {
      previews.push(body.ids);
      return route.fulfill({
        json: {
          rows: body.ids.map((id: string) => ({
            id,
            version: 1,
            hash: "a".repeat(64),
            contactRevision: 1,
            recipient: `anna${id.slice(1)}@example.test`,
            subject: `Anfrage ${id.slice(1)}`,
            body: "Guten Tag, synthetische Nachricht.",
            organisation: `Atelier ${id.slice(1)}`,
            publicAuthority: false,
            needsLegal: false,
            issues: [],
          })),
        },
      });
    }
    if (path === "/api/mail-review/approve-and-send") {
      expect(body.confirmDispatch).toBe(true);
      expect(body.read).toBe(true);
      expect(body.items).toHaveLength(1);
      const id = body.items[0].id;
      sent.push(id);
      const failed = id === "d0" && !!options.failure;
      return route.fulfill({
        json: {
          results: [
            {
              id,
              ok: !failed,
              stopBatch: failed && options.failure === "unknown",
              message: failed
                ? "Test: Prüfung oder Versand nicht bestätigt"
                : "Simuliert übergeben",
            },
          ],
        },
      });
    }
    if (path === "/api/mail-schedule/settings") {
      settingsCalls.push(body);
      expect(body.confirmDispatch).toBe(true);
      schedule = { ...schedule, ...body, revision: schedule.revision + 1 };
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({
      status: 503,
      json: { error: "Für diesen Test nicht verwendet" },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Kontakte\/Akquise/ }).click();
  return { sent, previews, settingsCalls };
}

for (const width of [390, 1024]) {
  test(`all queued mails can be reviewed and sent now with one approval at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const state = await setup(page, { queued: true });
    await page
      .getByRole("button", { name: "Alle jetzt senden (3) →", exact: true })
      .click();
    expect(state.previews).toEqual([["d0", "d1", "d2"]]);
    expect(state.sent).toEqual([]);
    const send = page.getByRole("button", {
      name: "Alle 3 jetzt senden",
      exact: true,
    });
    await expect(send).toBeDisabled();
    await expect(
      page.getByText(
        "Bestätige die Versandfreigabe für die ausgewählten Mails.",
      ),
    ).toBeVisible();
    await page
      .getByLabel(/Ich gebe die 3 ausgewählten persönlichen Mails/)
      .check();
    await page.screenshot({
      path: `.local/mailstudio-${width}.png`,
      fullPage: true,
    });
    await send.click();
    await expect(
      page.getByText("3 von 3 Mails bearbeitet.", { exact: true }),
    ).toBeVisible();
    expect(state.sent).toEqual(["d0", "d1", "d2"]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}

test("single mail action changes the approval scope and sends only that recipient", async ({
  page,
}) => {
  const state = await setup(page);
  await page
    .getByRole("button", { name: "Alle jetzt senden (3) →", exact: true })
    .click();
  await page
    .getByText("Nachrichten ansehen oder Auswahl anpassen (3)", { exact: true })
    .click();
  const message = page
    .locator(".mail-review-message")
    .filter({ hasText: "anna1@example.test" });
  await message.locator("summary").click();
  await message
    .getByRole("button", { name: "Nur diese Mail senden", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Jetzt senden", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel(/Ich gebe die 1 ausgewählten persönlichen Mails/)
    .check();
  await page.getByRole("button", { name: "Jetzt senden", exact: true }).click();
  await expect(
    page.getByText("1 von 1 Mails bearbeitet.", { exact: true }),
  ).toBeVisible();
  expect(state.sent).toEqual(["d1"]);
});

for (const failure of ["review", "unknown"] as const) {
  test(`bulk dispatch ${failure === "review" ? "continues after a pre-send review rejection" : "stops on uncertain SMTP without retry"}`, async ({
    page,
  }) => {
    const state = await setup(page, { failure });
    await page
      .getByRole("button", { name: "Alle jetzt senden (3) →", exact: true })
      .click();
    await page
      .getByLabel(/Ich gebe die 3 ausgewählten persönlichen Mails/)
      .check();
    await page
      .getByRole("button", { name: "Alle 3 jetzt senden", exact: true })
      .click();
    await expect(
      page.getByText(
        `${failure === "review" ? 3 : 1} von 3 Mails bearbeitet.`,
        { exact: true },
      ),
    ).toBeVisible();
    expect(state.sent).toEqual(
      failure === "review" ? ["d0", "d1", "d2"] : ["d0"],
    );
    await expect(
      page.getByLabel(/Ich gebe die .* ausgewählten persönlichen Mails/),
    ).not.toBeChecked();
  });
}

test("schedule starts directly from the overview after explicit approval", async ({
  page,
}) => {
  const state = await setup(page, { queued: true });
  await page
    .getByRole("button", { name: "Zeitplan & Versandstatus", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Zeitplan starten", exact: true })
    .click();
  const start = page.getByRole("button", {
    name: "Freigegebene Mails nach Zeitplan senden",
    exact: true,
  });
  await expect(start).toBeDisabled();
  expect(state.settingsCalls).toHaveLength(0);
  await page
    .getByLabel(
      "Ich bestätige den automatischen Versand nach diesem Zeitplan.",
      { exact: true },
    )
    .check();
  await start.click();
  await expect(
    page.getByText("Automatik aktiv", { exact: true }),
  ).toBeVisible();
  expect(state.settingsCalls).toHaveLength(1);
  expect(state.settingsCalls[0]).toMatchObject({
    revision: 1,
    enabled: true,
    startHour: 9,
    endHour: 17,
    dailyLimit: 50,
  });
  expect(state.sent).toEqual([]);
});
