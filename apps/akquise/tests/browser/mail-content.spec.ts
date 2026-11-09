import { test, expect, type Page } from "@playwright/test";

async function setup(
  page: Page,
  options: { queued?: boolean; failure?: "review" | "unknown" } = {},
) {
  const sent: string[] = [];
  let addition = "";
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
      route.request().method() === "POST" && path !== "/api/mail-images"
        ? route.request().postDataJSON()
        : {};
    if (path === "/api/mail-review/content") {
      expect(body.items).toHaveLength(3);
      addition = body.content;
      return route.fulfill({
        json: {
          results: body.items.map((i: { id: string }) => ({
            id: i.id,
            ok: true,
          })),
        },
      });
    }
    if (path === "/api/mail-images")
      return route.fulfill({
        json: { id: "12345678-1234-1234-1234-123456789abc" },
      });
    if (path.startsWith("/api/studio/assets/"))
      return route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="520" height="300"><rect width="520" height="300" fill="blue"/></svg>',
      });
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
            body: "Guten Tag, synthetische Nachricht.\n\n" + addition,
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
  await page.getByRole("button", { name: /^Akquise$/ }).click();
  return { sent, previews, settingsCalls };
}

for (const width of [390, 1024]) {
  test(`images and named links are applied to all mails at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const state = await setup(page, { queued: true });
    await page
      .getByRole("button", { name: "Gespeicherte Entwürfe öffnen (3)", exact: true })
      .click();
    await page.getByText("Bilder oder Links für alle Mails ergänzen", { exact: true }).click();
    await page.getByText("Bilder & Links hinzufügen", { exact: true }).click();
    await page
      .getByLabel(/Bild hochladen/)
      .setInputFiles({
        name: "project.png",
        mimeType: "image/png",
        buffer: Buffer.from("synthetic image"),
      });
    await expect(page.getByLabel("Bildbeschreibung")).toBeVisible();
    await page.getByLabel("Bildbeschreibung").fill("Projektbild");
    await page
      .getByLabel("Link (verlinkt auch das Bild)", { exact: true })
      .fill("https://studiojeker.ch/work");
    await page
      .getByLabel("Linktext", { exact: true })
      .fill("Unser Projekt ansehen");
    await page
      .getByRole("button", { name: "In 3 Mails übernehmen", exact: true })
      .click();
    await expect(
      page.getByText(
        "Bilder und Links übernommen. Bitte die aktualisierte Mailvorschau ansehen.",
      ),
    ).toBeVisible();
    const link = page
      .locator(".mail-preview-pane a")
      .filter({ hasText: "Unser Projekt ansehen" })
      .first();
    await expect(link).toHaveAttribute("href", "https://studiojeker.ch/work");
    expect(state.sent).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.local/mail-content-${width}.png`,
      fullPage: true,
    });
  });
}

