import { test, expect } from "@playwright/test";
import { setup } from "./mail-assistant-fixture";
for (const width of [390, 1024]) {
  test(`two workspaces, persistent selection and visible preview at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 960 });
    const state = await setup(page);
    const nav = page.getByRole("navigation", { name: "Akquise-Navigation" });
    await expect(nav.getByRole("button")).toHaveText([
      "Kontakte",
      "Mails",
      "Versandverlauf",
    ]);
    await nav.getByRole("button", { name: "Kontakte" }).click();
    await page.getByLabel("Atelier 1 auswählen", { exact: true }).check();
    await page
      .getByRole("button", { name: "1 Mails erstellen →", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "1 Kontakte ausgewählt" }),
    ).toBeVisible();
    await nav.getByRole("button", { name: "Kontakte", exact: true }).click();
    await page.getByRole("button", { name: "Kontakte recherchieren", exact: true }).click();
    await page
      .getByLabel("Wen möchtest du erreichen und was anbieten?")
      .fill("Industrieunternehmen für Businessfotografie finden");
    await page.getByLabel("Region", { exact: true }).fill("Solothurn");
    await nav
      .getByRole("button", { name: "Mails" })
      .click();
    await expect(
      page.getByRole("heading", { name: "1 Kontakte ausgewählt" }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Gespeicherte Entwürfe öffnen (3)",
        exact: true,
      })
      .click();
    await expect(
      page
        .locator(".mail-preview-pane")
        .getByRole("heading", { name: "Anfrage 0" }),
    ).toBeVisible();
    await page
      .getByRole("navigation", { name: "Mail-Empfänger" })
      .getByRole("button", { name: /Atelier 1/ })
      .click();
    await expect(
      page
        .locator(".mail-preview-pane")
        .getByRole("heading", { name: "Anfrage 1" }),
    ).toBeVisible();
    const recipients = page.getByRole("navigation", { name: "Mail-Empfänger" });
    await recipients.getByRole("button", { name: "Auswahl aufheben", exact: true }).click();
    await expect(recipients.getByRole("checkbox", { checked: true })).toHaveCount(0);
    await recipients.getByRole("button", { name: "Alle auswählen", exact: true }).click();
    await expect(recipients.getByRole("checkbox", { checked: true })).toHaveCount(3);
    await expect(page.getByRole("button", { name: "3 Mails jetzt senden", exact: true })).toBeDisabled();
    expect(state.sent).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.local/acquisition-${width}.png`,
      fullPage: true,
    });
    await nav.getByRole("button", { name: "Kontakte", exact: true }).click();
    await page.getByRole("button", { name: "Kontakte recherchieren", exact: true }).click();
    await expect(page.getByLabel("Region", { exact: true })).toHaveValue(
      "Solothurn",
    );
  });
}
test("inline edits autosave the exact version and invalidate dispatch approval", async ({
  page,
}) => {
  const state = await setup(page);
  let version = 1,
    subject = "Erste Nachricht",
    body = "Guten Tag, wir erstellen persönliche Inhalte.";
  let writes = 0;
  await page.route("**/api/mail-review/preview", (route) =>
    route.fulfill({
      json: {
        rows: [
          {
            id: "d0",
            version,
            hash: String(version).repeat(64),
            contactRevision: 1,
            recipient: "anna0@example.test",
            subject,
            body,
            organisation: "Atelier 0",
            issues: [],
            publicAuthority: false,
            needsLegal: false,
          },
        ],
      },
    }),
  );
  await page.route("**/api/drafts/d0", async (route) => {
    const value = route.request().postDataJSON();
    expect(Object.keys(value).sort()).toEqual([
      "body",
      "recipient",
      "subject",
      "version",
    ]);
    expect(value.version).toBe(version);
    subject = value.subject;
    body = value.body;
    version++;
    writes++;
    await route.fulfill({ json: { ok: true } });
  });
  await page
    .getByRole("button", { name: "Gespeicherte Entwürfe öffnen (3)" })
    .click();
  await page.getByLabel(/Ich gebe die 1 ausgewählten/).check();
  await page
    .getByRole("button", { name: "Text bearbeiten", exact: true })
    .click();
  await page
    .getByLabel("Betreff", { exact: true })
    .fill("Persönliche Einladung");
  await expect(
    page.getByRole("button", { name: "1 Mail jetzt senden", exact: true }),
  ).toBeDisabled();
  await expect.poll(() => writes).toBe(1);
  await expect(page.getByLabel("Betreff", { exact: true })).toHaveValue(
    "Persönliche Einladung",
  );
  await expect(
    page.getByLabel(/Ich gebe die 1 ausgewählten/),
  ).not.toBeChecked();
  await page
    .getByRole("button", { name: "Vorschau anzeigen", exact: true })
    .click();
  await expect(
    page
      .locator(".mail-preview-pane")
      .getByRole("heading", { name: "Persönliche Einladung" }),
  ).toBeVisible();
  expect(state.sent).toEqual([]);
});

