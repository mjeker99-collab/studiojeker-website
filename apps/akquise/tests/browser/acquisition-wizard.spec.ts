import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

mkdirSync(".local/acquisition-previews", { recursive: true });

function contacts(count: number) {
  return Array.from({ length: count + 1 }, (_, index) => ({
    id: `c${index}`,
    revision: 1,
    organisation: `Firma ${index}`,
    firstName: "Anna",
    lastName: String(index),
    email: `anna${index}@example.test`,
    status: index === count ? "SENT" : "NEW",
    industry: "Architektur",
  }));
}

async function install(page: Page, count: number) {
  const people = contacts(count);
  const rows = people.slice(0, count).map((person, index) => ({
    id: `d${index}`,
    contactId: person.id,
    version: 1,
    hash: "a".repeat(64),
    contactRevision: 1,
    recipient: person.email,
    subject: `Anfrage ${index}`,
    body: `Guten Tag\n\nSynthetischer Text ${index}.\n\nBeste Grüsse\nNora Jeker`,
    organisation: person.organisation,
    publicAuthority: false,
    needsLegal: false,
    issues: index === 1 && count > 2 ? ["Quellen-URL fehlt."] : [],
    deliveryStatus: index === 2 && count > 2 ? "SENT" : null,
    queueStatus: null,
  }));
  let plans = 0;
  let planBody: Record<string, unknown> | null = null;
  let releasePlan: (() => void) | null = null;
  const planGate = new Promise<void>((resolve) => {
    releasePlan = resolve;
  });
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body =
      route.request().method() === "POST" ? route.request().postDataJSON() : {};
    if (path === "/api/mail-assistant/history")
      return route.fulfill({ json: [] });
    if (path === "/api/state" || path === "/api/hub/state") {
      return route.fulfill({
        json:
          path === "/api/hub/state"
            ? {
                campaigns: [],
                contents: [],
                users: [],
                drafts: [],
                customers: [],
                integrations: {},
                events: [],
              }
            : {
                user: { id: "test", name: "Nora Jeker" },
                users: [],
                contacts: people,
                drafts: [],
                deliveries: [],
                suppressions: [],
                audits: [],
                generator: "disabled",
                externalSending: false,
                mailMode: "disabled",
              },
      });
    }
    if (path.startsWith("/api/drive/status"))
      return route.fulfill({
        json: { role: "self", access: "ready", folderName: "Adressen" },
      });
    if (path === "/api/contacts/preparation/preview") {
      return route.fulfill({
        json: {
          contacts: body.ids.map((id: string) => {
            const person = people.find((item) => item.id === id);
            return {
              id,
              revision: 1,
              ready: true,
              changed: false,
              organisation: person?.organisation,
              issues: [],
            };
          }),
        },
      });
    }
    if (path === "/api/contacts/preparation/prepare") {
      return route.fulfill({
        json: {
          results: body.contacts.map((item: { id: string }) => ({
            id: item.id,
            ok: true,
            draftId: `d${item.id.slice(1)}`,
          })),
        },
      });
    }
    if (path === "/api/mail-review/preview") {
      return route.fulfill({
        json: {
          rows: body.ids
            .map((id: string) => rows.find((row) => row.id === id))
            .filter(Boolean),
        },
      });
    }
    if (path === "/api/mail-review/revise") {
      return route.fulfill({
        json: {
          results: body.items.map((item: { id: string }) => {
            const row = rows.find((entry) => entry.id === item.id);
            const nextBody = body.append
              ? row!.body.replace(
                  "Beste Grüsse",
                  `${body.append}\n\nBeste Grüsse`,
                )
              : row?.body.split(body.find).join(body.replace) || "";
            if (body.confirmed && row) {
              row.version += 1;
              row.hash = "b".repeat(64);
              row.body = nextBody;
            }
            return {
              id: item.id,
              ok: true,
              subject: row?.subject,
              body: nextBody,
              organisation: row?.organisation,
              message: body.confirmed
                ? "Gespeichert. Die frühere Freigabe gilt nicht mehr."
                : "Vorschau der Änderung",
            };
          }),
        },
      });
    }
    if (path.startsWith("/api/drafts/")) {
      const id = path.split("/").pop();
      const row = rows.find((entry) => entry.id === id);
      if (row) {
        row.version += 1;
        row.hash = "c".repeat(64);
        row.subject = body.subject;
        row.body = body.body;
      }
      return route.fulfill({ json: { ok: true } });
    }
    if (path === "/api/mail-review/approve-and-plan") {
      plans += 1;
      planBody = body;
      if (plans === 1) await planGate;
      return route.fulfill({
        json: {
          results: body.items.map((item: { id: string }) => ({
            id: item.id,
            ok: true,
          })),
          summary: {
            queued: body.items.length,
            started: body.mode === "immediate" ? 1 : 0,
            failed: 0,
            message:
              body.mode === "immediate"
                ? "1 Mail ist in den Versand gegangen. Weitere warten."
                : `${body.items.length} Mails sind für ${body.localDate} ${body.localTime} Uhr (Europe/Zurich) eingeplant.`,
            whenLabel:
              body.mode === "scheduled"
                ? `${body.localDate} ${body.localTime} Uhr (Europe/Zurich)`
                : null,
          },
        },
      });
    }
    return route.fulfill({ json: {} });
  });
  return {
    rows,
    planBody: () => planBody,
    plans: () => plans,
    release() {
      releasePlan?.();
    },
  };
}

for (const count of [1, 97, 183]) {
  test(`selects ${count} filtered contacts and keeps contacted people visible`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await install(page, count);
    await page.goto("/");
    await page.getByRole("button", { name: /^Akquise$/ }).click();
    await page.getByRole("button", { name: "Alle" }).click();
    await expect(page.getByText(`${count} Kontakte ausgewählt.`)).toBeVisible();
    await page
      .getByRole("checkbox", {
        name: /Bereits kontaktierte und gesperrte Kontakte anzeigen/,
      })
      .check();
    await expect(
      page.getByText("Bereits kontaktiert", { exact: false }).last(),
    ).toBeVisible();
    const checked = page.locator(
      '.contact-choice input[type="checkbox"]:checked',
    );
    await expect(checked).toHaveCount(count);
  });
}

for (const [width, height] of [
  [390, 844],
  [768, 1024],
  [1024, 768],
] as const) {
  test(`four-step wizard at ${width}px`, async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width, height });
    const state = await install(page, 4);
    await page.goto("/");
    await page.getByRole("button", { name: /^Akquise$/ }).click();
    await expect(
      page.getByRole("heading", { name: "Kontakte auswählen" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Mails prüfen", exact: true }),
    ).toHaveCount(0);
    await page.screenshot({
      path: `.local/acquisition-previews/akquise-step1-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Alle" }).click();
    await page
      .getByRole("button", {
        name: "Personalisierte Mails erstellen",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("heading", { name: "Personalisierte Mails erstellen" }),
    ).toBeVisible();
    await expect(page.getByText("Anfrage 0")).toBeVisible();
    await page.screenshot({
      path: `.local/acquisition-previews/akquise-step2-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Mails prüfen", exact: true })
      .click();
    await expect(page.getByText("Quellen-URL fehlt.")).toBeVisible();
    await expect(
      page.getByText(/bereits versendet oder eingeplant/i).last(),
    ).toBeVisible();
    const sendBox = page.getByRole("checkbox", {
      name: "Firma 0 mitversenden",
    });
    await expect(sendBox).toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: "Firma 1 mitversenden" }),
    ).toBeEnabled();
    await expect(
      page.getByRole("checkbox", { name: "Firma 2 mitversenden" }),
    ).toBeDisabled();
    await page.getByRole("button", { name: /Firma 0/ }).click();
    await expect(page.locator(".mail-review-body")).toContainText(
      "Beste Grüsse",
    );
    await page.getByLabel("Änderung", { exact: true }).selectOption("replace");
    await page.getByLabel("Text suchen").fill("Synthetischer");
    await page.getByLabel("Ersetzen durch").fill("Persönlicher");
    await page.getByRole("button", { name: "Änderung anzeigen" }).click();
    await expect(page.getByText("Persönlicher Text 0.")).toBeVisible();
    await page.getByRole("button", { name: "Änderung übernehmen" }).click();
    await expect(
      page.getByText("Die frühere Freigabe gilt nicht mehr.").first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Text bearbeiten" }).click();
    await page
      .getByLabel("Betreff", { exact: true })
      .fill("Korrigierte Anfrage");
    await expect(page.getByText("Gespeichert", { exact: true })).toBeVisible();
    await page.screenshot({
      path: `.local/acquisition-previews/akquise-step3-${width}.png`,
      fullPage: true,
    });
    await page.reload();
    await page.getByRole("button", { name: /^Akquise$/ }).click();
    await expect(
      page.getByRole("heading", { name: "Mails prüfen und bearbeiten" }),
    ).toBeVisible();
    await page
      .getByRole("checkbox", { name: /ausgewählten Mails geprüft/ })
      .check();
    await page.getByRole("button", { name: "Weiter zum Versand" }).click();
    await expect(
      page.getByRole("checkbox", { name: /gebe genau diesen Versand frei/ }),
    ).not.toBeChecked();
    await page.getByLabel("Sofort senden").check();
    await page.getByLabel("Versand planen").check();
    await page.getByLabel("Datum (Europe/Zurich)").fill("2026-12-01");
    await page.getByLabel("Uhrzeit (Europe/Zurich)").fill("10:30");
    await page
      .getByRole("checkbox", { name: /gebe genau diesen Versand frei/ })
      .check();
    const scheduleLabel = page.getByRole("button", {
      name: /Mails für 2026-12-01 um 10:30 Uhr einplanen/,
    });
    await expect(scheduleLabel).toBeEnabled();
    if (width !== 1024) {
      await page.getByLabel("Sofort senden").check();
      await page.screenshot({
        path: `.local/acquisition-previews/akquise-step4-${width}.png`,
        fullPage: true,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      return;
    }
    await page.screenshot({
      path: `.local/acquisition-previews/akquise-step4-${width}.png`,
      fullPage: true,
    });
    await scheduleLabel.evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
    await expect.poll(() => state.plans()).toBe(1);
    state.release();
    await expect(
      page.getByRole("heading", { name: "Versand erfasst" }),
    ).toBeVisible();
    await expect(page.getByRole("status")).toContainText("2026-12-01 10:30");
    const sent = state.planBody();
    expect(sent?.mode).toBe("scheduled");
    expect(sent?.localDate).toBe("2026-12-01");
    expect(sent?.localTime).toBe("10:30");
    expect(sent?.items).toEqual([
      expect.objectContaining({ id: "d0" }),
      expect.objectContaining({ id: "d3" }),
    ]);
    expect(state.plans()).toBe(1);
    await page.getByRole("button", { name: "Neue Mails erstellen" }).click();
    await expect(
      page.getByRole("heading", { name: "Kontakte auswählen" }),
    ).toBeVisible();
  });
}

test("quick selection, individual toggles, global addition and no empty checkout", async ({
  page,
}) => {
  await install(page, 215);
  await page.goto("/");
  await page.getByRole("button", { name: /^Akquise$/ }).click();
  for (const count of [10, 20, 50, 100]) {
    await page
      .getByRole("button", { name: String(count), exact: true })
      .click();
    await expect(page.getByText(`${count} Kontakte ausgewählt.`)).toBeVisible();
  }
  const first = page.getByRole("checkbox", {
    name: "Firma 0 auswählen",
    exact: true,
  });
  await first.uncheck();
  await expect(page.getByText("99 Kontakte ausgewählt.")).toBeVisible();
  await first.check();
  await page.getByRole("button", { name: "Alle", exact: true }).click();
  await expect(page.getByText("215 Kontakte ausgewählt.")).toBeVisible();
  await page
    .getByRole("button", {
      name: "Personalisierte Mails erstellen",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Mails prüfen", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "4 Versand", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: /Firma 1\b/ }).click();
  await expect(
    page.getByRole("button", { name: "Text bearbeiten" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Text bearbeiten" }).click();
  await page
    .getByLabel("Betreff", { exact: true })
    .fill("Korrigierbar trotz fehlender Quelle");
  await expect(page.getByText("Gespeichert", { exact: true })).toBeVisible();
  await page.getByLabel("Ergänzung für alle").fill("Unser gemeinsamer Zusatz.");
  await page.getByRole("button", { name: "Änderung anzeigen" }).click();
  await expect(
    page.getByText(/Unser gemeinsamer Zusatz\./).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Änderung übernehmen" }).click();
  await expect(
    page
      .getByText("Gespeichert. Die frühere Freigabe gilt nicht mehr.")
      .first(),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: /ausgewählten Mails geprüft/ })
    .check();
  await page.getByRole("button", { name: "Weiter zum Versand" }).click();
  await expect(
    page.getByText("213 Mails in der angezeigten Version."),
  ).toBeVisible();
});
