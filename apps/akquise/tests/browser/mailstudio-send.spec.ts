import { test, expect, type Page } from "@playwright/test";

async function setup(
  page: Page,
  options: { queued?: boolean; failure?: "review" | "unknown"; draftCount?: number } = {},
) {
  const sent: string[] = [];
  const previews: string[][] = [];
  const settingsCalls: Record<string, unknown>[] = [];
  const contacts = Array.from({ length: options.draftCount ?? 3 }, (_, i) => ({
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
    if (path === "/api/mail-review/approve-and-start") {
      expect(body.confirmDispatch).toBe(true);
      expect(body.read).toBe(true);
      if (options.failure === "unknown")
        return route.fulfill({
          status: 409,
          json: { error: "Ein Versand ist unklar. Versandverlauf prüfen." },
        });
      const ids = body.items.map((item: { id: string }) => item.id);
      sent.push(...ids);
      return route.fulfill({
        json: {
          results: ids.map((id: string) => ({
            id,
            ok: !(id === "d0" && options.failure === "review"),
            message: "Eingeplant",
          })),
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
  await page.getByRole("button", { name: /^Akquise$/ }).click();
  return { sent, previews, settingsCalls };
}

for (const width of [390, 768, 1024]) {
  test(`queue action appears before the recipient list and selection changes require new confirmation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const draftCount = width === 768 ? 183 : 3;
    const state = await setup(page, { draftCount });
    await page.getByText("Weitere Optionen", { exact: true }).click();
    await page
      .getByRole("button", { name: "Zeitplan & Versandstatus", exact: true })
      .click();
    await page.getByText(`Bereits freigegebene Mails einplanen (${draftCount})`, {
      exact: true,
    }).click();

    const panel = page.locator(".mail-schedule");
    const action = panel.getByRole("button", {
      name: /ausgewählte Mails einplanen$/,
    });
    await expect(action).toBeDisabled();
    await panel.getByRole("button", { name: "Alle auswählen", exact: true }).click();
    await expect(panel.getByText(`${draftCount} von ${draftCount} Mails ausgewählt.`, { exact: true })).toBeVisible();
    const buttonBox = await action.boundingBox();
    const listBox = await panel.locator(".draft-list").boundingBox();
    expect(buttonBox).not.toBeNull();
    expect(listBox).not.toBeNull();
    expect(buttonBox!.y).toBeLessThan(listBox!.y);

    const confirmation = panel.getByRole("checkbox", { name: /Nachrichten für den automatischen Versand einplanen/ });
    await expect(confirmation).not.toBeChecked();
    await confirmation.check();
    await expect(action).toBeEnabled();
    await panel.getByLabel(/anna0@example.test/).uncheck();
    await expect(panel.getByText(`${draftCount - 1} von ${draftCount} Mails ausgewählt.`, { exact: true })).toBeVisible();
    await expect(confirmation).not.toBeChecked();
    await expect(action).toBeDisabled();
    expect(state.sent).toEqual([]);
  });
}

for (const width of [390, 1024]) {
  test(`all queued mails can be reviewed and sent now with one approval at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const state = await setup(page, { queued: true });
    await page
      .getByRole("button", {
        name: "Gespeicherte Entwürfe öffnen (3)",
        exact: true,
      })
      .click();
    expect(state.previews[0]).toEqual(["d0", "d1", "d2"]);
    expect(state.sent).toEqual([]);
    const send = page.getByRole("button", {
      name: "Versand starten · 3 Mails",
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
      page.getByText(
        "3 Mails eingeplant. Der Versand läuft im Hintergrund innerhalb der Versandzeiten und des Tageslimits.",
        { exact: true },
      ),
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
    .getByRole("button", {
      name: "Gespeicherte Entwürfe öffnen (3)",
      exact: true,
    })
    .click();
  await page.getByLabel("anna0@example.test für Versand auswählen").uncheck();
  await page.getByLabel("anna2@example.test für Versand auswählen").uncheck();
  await expect(
    page.getByRole("button", { name: "Versand starten · 1 Mail", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel(/Ich gebe die 1 ausgewählten persönlichen Mails/)
    .check();
  await page
    .getByRole("button", { name: "Versand starten · 1 Mail", exact: true })
    .click();
  await expect(
    page.getByText(
      "1 Mails eingeplant. Der Versand läuft im Hintergrund innerhalb der Versandzeiten und des Tageslimits.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(state.sent).toEqual(["d1"]);
});

for (const failure of ["review", "unknown"] as const) {
  test(`bulk dispatch ${failure === "review" ? "continues after a pre-send review rejection" : "stops on uncertain SMTP without retry"}`, async ({
    page,
  }) => {
    const state = await setup(page, { failure });
    await page
      .getByRole("button", {
        name: "Gespeicherte Entwürfe öffnen (3)",
        exact: true,
      })
      .click();
    await page
      .getByLabel(/Ich gebe die 3 ausgewählten persönlichen Mails/)
      .check();
    await page
      .getByRole("button", { name: "Versand starten · 3 Mails", exact: true })
      .click();
    if (failure === "review") {
      await expect(
        page.getByText(
          "2 Mails eingeplant. Der Versand läuft im Hintergrund innerhalb der Versandzeiten und des Tageslimits.",
          { exact: true },
        ),
      ).toBeVisible();
      expect(state.sent).toEqual(["d0", "d1", "d2"]);
    } else {
      await expect(page.getByRole("alert").filter({ hasText: "Versand unterbrochen" })).toContainText(
        "Versand unterbrochen",
      );
      expect(state.sent).toEqual([]);
    }
    await expect(
      page.getByLabel(/Ich gebe die .* ausgewählten persönlichen Mails/),
    ).not.toBeChecked();
  });
}

test("schedule starts directly from the overview after explicit approval", async ({
  page,
}) => {
  const state = await setup(page, { queued: true });
  await page.getByText("Weitere Optionen", { exact: true }).click();
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

test("discard requires confirmation and leaves the selection intact on cancel", async ({
  page,
}) => {
  await setup(page);
  let discarded: string[] = [];
  await page.route("**/api/mail-review/discard", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.confirmed).toBe(true);
    discarded = body.items.map((item: { id: string }) => item.id);
    await route.fulfill({
      json: {
        results: body.items.map((item: { id: string }) => ({
          id: item.id,
          ok: true,
        })),
      },
    });
  });
  await page
    .getByRole("button", {
      name: "Gespeicherte Entwürfe öffnen (3)",
      exact: true,
    })
    .click();
  await page.getByText("Weitere Optionen", { exact: true }).click();
  const open = page.getByRole("button", {
    name: "Auswahl und ungesendete Entwürfe verwerfen",
    exact: true,
  });
  await open.click();
  const panel = page.getByRole("region", { name: "Entwürfe verwerfen" });
  await expect(
    panel.getByRole("button", { name: "Auswahl jetzt verwerfen", exact: true }),
  ).toBeDisabled();
  await panel.getByRole("button", { name: "Abbrechen", exact: true }).click();
  expect(discarded).toEqual([]);
  await expect(
    page.getByRole("button", {
      name: "Versand starten · 3 Mails",
      exact: true,
    }),
  ).toBeVisible();
  await open.click();
  await panel.getByLabel(/Ich bestätige das Verwerfen/).check();
  await panel
    .getByRole("button", { name: "Auswahl jetzt verwerfen", exact: true })
    .click();
  await expect(
    page.getByText(/3 Entwürfe verworfen. Auswahl zurückgesetzt/),
  ).toBeVisible();
  expect(discarded).toEqual(["d0", "d1", "d2"]);
});
