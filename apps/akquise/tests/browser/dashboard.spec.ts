import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
const access =
  process.env.E2E_EMAIL && process.env.E2E_PASSWORD
    ? `Lokales synthetisches Konto: ${process.env.E2E_EMAIL}\nEinmaliges Passwort: ${process.env.E2E_PASSWORD}`
    : readFileSync(".local/demo-access.txt", "utf8");
const credential = access.match(
  /Lokales synthetisches Konto: (\S+)\s+Einmaliges Passwort: (\S+)/,
);
if (!credential)
  throw new Error(
    "Synthetischen Seed auf leerer lokaler Datenbank ausführen. Zugangsdaten werden unter .local/demo-access.txt erwartet.",
  );
const email = credential[1],
  password = credential[2];
async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByLabel("E-Mail", { exact: true }).fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page.getByRole("button", { name: /Sicher anmelden/ }).click();
  await expect(
    page.getByRole("heading", { name: "Übersicht", exact: true }),
  ).toBeVisible();
}
for (const width of [390, 768, 1440]) {
  test(`Mail-Studio ${width}px: gemeinsame Vorschau, Freigabe und Versandübergabe`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await signIn(page);
    const suffix = `global-${width}-${Date.now()}`;
    const ids: string[] = [];
    for (let i = 0; i < 2; i++) {
      const created = await page.request.post("/api/contacts", {
        headers: { Origin: "http://localhost:3100" },
        data: {
          organisation: `Mail-Studio ${suffix} ${i}`,
          firstName: "Anna",
          lastName: "Muster",
          email: `${suffix}.${i}@example.test`,
          confidence: "VERIFIED",
          verifiedAt: "2026-01-01T00:00:00.000Z",
          sourceUrl: "https://example.test/team",
          hook: "Synthetisch dokumentierter Bedarf an Architekturfotografie.",
          notes: `Betreff: Architektur ${i}\nE-Mail-Entwurf: Guten Tag Frau Muster\n\nPersönlicher Architekturtext ${i}.\n\nFreundliche Grüsse\nNora Jeker`,
        },
      });
      expect(created.ok()).toBe(true);
      const draft = await page.request.post("/api/drafts", {
        headers: { Origin: "http://localhost:3100" },
        data: { contactId: (await created.json()).id },
      });
      expect(draft.ok()).toBe(true);
      ids.push((await draft.json()).id);
    }
    await page.reload();
    await page.getByRole("button", { name: /Kontakte\/Akquise/ }).click();
    await page.getByLabel("Mails suchen", { exact: true }).fill(suffix);
    await page
      .getByRole("button", {
        name: "Erste 25 angezeigte Mails auswählen",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "2 Mails gemeinsam prüfen", exact: true })
      .click();
    const panel = page.getByRole("region", {
      name: "Globale Mailprüfung",
      exact: true,
    });
    await expect(
      panel.getByText("Persönlicher Architekturtext 0.", { exact: false }),
    ).toBeVisible();
    await expect(
      panel.getByText("Persönlicher Architekturtext 1.", { exact: false }),
    ).toBeVisible();
    const approve = panel.getByRole("button", {
      name: "2 Mails freigeben und einplanen",
      exact: true,
    });
    await expect(approve).toBeDisabled();
    await panel
      .getByLabel("Rechtsgrundlage und Nachweis", { exact: true })
      .fill("Expliziter synthetischer Nachweis für beide Testkontakte.");
    await panel.getByLabel(/Ich bestätige die Zulässigkeit/).check();
    await panel.getByLabel(/Ich habe alle 2 ausgewählten Nachrichten/).check();
    await panel.getByLabel(/Diese 2 Mails nach der Freigabe/).check();
    await expect(approve).toBeEnabled();
    await panel
      .getByLabel("Rechtsgrundlage und Nachweis", { exact: true })
      .fill("Aktualisierter synthetischer Nachweis für beide Testkontakte.");
    await expect(approve).toBeDisabled();
    await panel.getByLabel(/Ich bestätige die Zulässigkeit/).check();
    await panel.getByLabel(/Ich habe alle 2 ausgewählten Nachrichten/).check();
    expect(
      (await new AxeBuilder({ page }).include(".mail-studio").analyze())
        .violations,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await approve.click();
    await expect(panel.getByRole("status")).toContainText(
      "2 freigegeben und eingeplant · 0 noch offen.",
    );
    const state = await (await page.request.get("/api/state")).json();
    expect(
      state.deliveries.filter((d: { draftId: string }) =>
        ids.includes(d.draftId),
      ),
    ).toHaveLength(0);
    await panel
      .getByRole("button", { name: "Weiter zum Versand", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Täglicher Mailversand", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Pausiert", { exact: true })).toBeVisible();
  });
}
for (const width of [390, 768, 1440]) {
  test(`Prüfdaten gemeinsam übernehmen ${width}px: Vorschau, Bestätigung und Einzelresultate`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await signIn(page);
    const suffix = `${width}-${Date.now()}`;
    const organisation = `Synthetische Sammelprüfung ${suffix}`;
    const created = await page.request.post("/api/contacts", {
      headers: { Origin: "http://localhost:3100" },
      data: {
        organisation,
        firstName: "Anna",
        lastName: "Muster",
        email: `batch.${suffix}@example.test`,
        sourceUrl: "https://example.test/team",
        notes:
          "Prüfstatus: Persönliche Adresse verifiziert\nPrüfdatum: 01.01.2026\nBetreff: Persönliche Projektbilder\nE-Mail-Entwurf: Guten Tag Frau Muster\n\nDokumentiertes synthetisches Projekt in Burgdorf.\n\nFreundliche Grüsse\nNora Jeker",
      },
    });
    expect(created.ok()).toBe(true);
    const c = await created.json();
    const incomplete = await page.request.post("/api/contacts", {
      headers: { Origin: "http://localhost:3100" },
      data: {
        organisation: organisation + " Lücke",
        firstName: "Eva",
        lastName: "Muster",
        email: `gap.${suffix}@example.test`,
      },
    });
    expect(incomplete.ok()).toBe(true);
    await page.reload();
    await page
      .getByRole("heading", { name: "Übersicht", exact: true })
      .waitFor();
    await page.getByRole("button", { name: /Kontakte\/Akquise/ }).click();
    await page.getByRole("button", { name: "Kontakte", exact: true }).click();
    await page.getByLabel(`${organisation} auswählen`, { exact: true }).check();
    await page
      .getByLabel(`${organisation} Lücke auswählen`, { exact: true })
      .check();
    const panel = page.getByRole("region", { name: "2 Kontakte vorbereiten" });
    await panel
      .getByRole("button", { name: "Prüfdaten aus Notizen prüfen" })
      .click();
    await expect(
      panel.getByText("1 Kontakte vollständig · 1 mit offenen Angaben."),
    ).toBeVisible();
    await expect(panel.getByText(/Verifikationsdatum fehlt/)).toBeVisible();
    await panel
      .getByRole("button", { name: "Alle vollständigen Vorschläge auswählen" })
      .click();
    const apply = panel.getByRole("button", {
      name: "1 bestätigte Prüfdaten übernehmen",
    });
    await expect(apply).toBeDisabled();
    await panel.getByLabel(/Ich habe die ausgewählten Angaben/).check();
    expect(
      (await new AxeBuilder({ page }).include(".contact-preparation").analyze())
        .violations,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await apply.click();
    await expect(panel.getByRole("status")).toContainText(
      "Prüfdaten übernommen",
    );
    const prepare = panel.getByRole("button", {
      name: "1 Kontakte übernehmen und Entwürfe vorbereiten",
    });
    for (let attempt = 0; attempt < 2; attempt++) {
      await expect(
        panel.getByRole("button", { name: "Vorschau aktualisieren" }),
      ).toBeEnabled();
      await panel.getByLabel(/Ich habe die ausgewählten Angaben/).check();
      await prepare.click();
      await expect(panel.getByRole("status")).toContainText(
        "1 erfolgreich · 0 noch zu bearbeiten",
      );
      await expect(
        panel.getByText("1 Kontakte vollständig · 1 mit offenen Angaben."),
      ).toBeVisible();
    }
    const state = await (await page.request.get("/api/state")).json();
    expect(
      state.contacts.find((contact: { id: string }) => contact.id === c.id)
        .newsletterConsent,
    ).toBe(false);
    expect(
      state.drafts.filter(
        (draft: { contactId: string }) => draft.contactId === c.id,
      ),
    ).toHaveLength(1);
    expect(
      (
        await page.request.post("/api/contacts/preparation/preview", {
          headers: { Origin: "https://example.test" },
          data: { ids: [c.id] },
        })
      ).status(),
    ).toBe(403);
  });
}
for (const width of [390, 768, 1440]) {
  test(`Sammelbearbeitung ${width}px: gemeinsame Angaben und Ausnahmen ohne Kontaktmodal`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await signIn(page);
    const suffix = `${width}-${Date.now()}`;
    const names = [
      `Gemeinsame Angaben A ${suffix}`,
      `Gemeinsame Angaben B ${suffix}`,
    ];
    const ids: string[] = [];
    for (const [i, organisation] of names.entries()) {
      const response = await page.request.post("/api/contacts", {
        headers: { Origin: "http://localhost:3100" },
        data: {
          organisation,
          firstName: i ? "Eva" : "Anna",
          lastName: "Muster",
          email: `bulk.${i}.${suffix}@example.test`,
          notes: `Betreff: Persönlich ${i}\nE-Mail-Entwurf: Guten Tag Frau Muster\n\nIndividueller Bezug ${i}.\n\nFreundliche Grüsse\nNora Jeker`,
        },
      });
      expect(response.ok()).toBe(true);
      ids.push((await response.json()).id);
    }
    await page.reload();
    await page
      .getByRole("heading", { name: "Übersicht", exact: true })
      .waitFor();
    await page.getByRole("button", { name: /Kontakte\/Akquise/ }).click();
    await page.getByRole("button", { name: "Kontakte", exact: true }).click();
    for (const name of names)
      await page.getByLabel(`${name} auswählen`, { exact: true }).check();
    const panel = page.getByRole("region", { name: "2 Kontakte vorbereiten" });
    const common = panel.getByRole("group", {
      name: "Gemeinsame Angaben für die Auswahl",
    });
    await common.getByLabel("Prüfstatus").selectOption("VERIFIED");
    await common.getByLabel("Verifikationsdatum").fill("2026-01-02");
    await common
      .getByLabel("Quellen-URL")
      .fill("https://example.test/gepruefte-liste");
    await panel
      .getByRole("button", { name: "Prüfdaten aus Notizen prüfen" })
      .click();
    await expect(
      panel.getByText("2 Kontakte vollständig · 0 mit offenen Angaben."),
    ).toBeVisible();
    const prepare = panel.getByRole("button", {
      name: "2 Kontakte übernehmen und Entwürfe vorbereiten",
    });
    await expect(prepare).toBeDisabled();
    await panel.getByLabel(/Ich habe die ausgewählten Angaben/).check();
    await expect(prepare).toBeEnabled();
    await panel.locator("summary").filter({ hasText: names[1] }).click();
    const row = panel.getByRole("group", { name: "Angaben für Eva Muster" });
    await row
      .getByLabel("Quellen-URL")
      .fill("https://example.test/individueller-beleg");
    await expect(prepare).toBeDisabled();
    await expect(
      panel.getByLabel(/Ich habe die ausgewählten Angaben/),
    ).not.toBeChecked();
    await panel.getByRole("button", { name: "Vorschau aktualisieren" }).click();
    await panel.getByLabel(/Ich habe die ausgewählten Angaben/).check();
    expect(
      (await new AxeBuilder({ page }).include(".contact-preparation").analyze())
        .violations,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await prepare.click();
    await expect(panel.getByRole("status")).toContainText(
      "2 erfolgreich · 0 noch zu bearbeiten",
    );
    await expect(
      panel.getByRole("button", { name: "Vorschau aktualisieren" }),
    ).toBeEnabled();
    const state = await (await page.request.get("/api/state")).json();
    for (const [i, id] of ids.entries()) {
      const contact = state.contacts.find((c: { id: string }) => c.id === id);
      expect(contact.sourceUrl).toBe(
        i
          ? "https://example.test/individueller-beleg"
          : "https://example.test/gepruefte-liste",
      );
      expect(contact.hook).toBe(`Individueller Bezug ${i}.`);
      expect(contact.newsletterConsent).toBe(false);
      expect(
        state.drafts.filter((d: { contactId: string }) => d.contactId === id),
      ).toHaveLength(1);
    }
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
}
for (const width of [390, 768, 1440]) {
  test(`Täglicher Versand ${width}px: pausiert, bedienbar und ohne Überlauf`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await signIn(page);
    await page.getByRole("button", { name: /Kontakte\/Akquise/ }).click();
    const [scheduleResponse] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/mail-schedule") &&
          response.request().method() === "GET",
      ),
      page
        .getByRole("button", { name: "Versandhistorie", exact: true })
        .click(),
    ]);
    expect(scheduleResponse.status(), await scheduleResponse.text()).toBe(200);
    await expect(
      page.getByRole("heading", { name: "Täglicher Mailversand" }),
    ).toBeVisible();
    await page.getByText("Zeitplan bearbeiten", { exact: true }).click();
    await expect(page.getByLabel("Mails pro Tag", { exact: true })).toHaveValue(
      "25",
    );
    await expect(
      page.getByRole("button", { name: "Versand starten" }),
    ).toBeDisabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const results = await new AxeBuilder({ page })
      .include('[aria-labelledby="mail-schedule-title"]')
      .analyze();
    expect(results.violations).toEqual([]);
    expect((await request.post("/api/internal/mail-tick")).status()).toBe(401);
    expect(
      (
        await request.post("/api/mail-schedule/pause", {
          headers: { Origin: "https://example.test" },
          data: {},
        })
      ).status(),
    ).toBe(403);
  });
}
test("API schützt Daten, Ursprung und externen Versand", async ({
  request,
}) => {
  const unauthorized = await request.get("/api/state");
  expect(unauthorized.status()).toBe(401);
  expect((await request.get("/api/dashboard")).status()).toBe(401);
  const badOrigin = await request.post("/api/login", {
    headers: { Origin: "https://example.test" },
    data: { email, password },
  });
  expect(badOrigin.status()).toBe(403);
  await request.post("/api/login", {
    headers: { Origin: "http://localhost:3100" },
    data: { email, password },
  });
  const send = await request.post("/api/send", {
    headers: { Origin: "http://localhost:3100" },
    data: {},
  });
  expect(send.status()).toBe(403);
  expect((await send.json()).error).toContain("deaktiviert");
  const state = await request.get("/api/state");
  expect((await state.json()).externalSending).toBe(false);
  const huge = await request.post("/api/contacts", {
    headers: { Origin: "http://localhost:3100" },
    data: { notes: "x".repeat(65000) },
  });
  expect(huge.status()).toBe(413);
});
for (const [name, width, height] of [
  ["Desktop", 1440, 1000],
  ["iPad quer", 1024, 768],
  ["iPad hoch", 768, 1024],
  ["Mobil", 390, 844],
] as const) {
  test(`${name}: Dashboard und Navigation ohne Seitenüberlauf`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await signIn(page);
    await expect(
      page.getByRole("heading", { name: "Deine Arbeitsbereiche" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.local/dashboard-${width}.png`,
      fullPage: true,
    });
    for (const section of [
      "Kontakte",
      "E-Mail-Entwürfe",
      "Freigaben",
      "Versandhistorie",
      "Einstellungen",
    ]) {
      if (section !== "Einstellungen")
        await page
          .getByRole("navigation", { name: "Hauptnavigation" })
          .getByRole("button", { name: /Kontakte/ })
          .click();
      await page
        .getByRole("navigation", {
          name:
            section === "Einstellungen"
              ? "Hauptnavigation"
              : "Akquise-Navigation",
        })
        .getByRole("button", { name: section, exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: section, exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  });
}
test("Kontakt, Rechtsprüfung, versionierter Entwurf und Freigabe sind bedienbar", async ({
  page,
}) => {
  await signIn(page);
  const suffix = Date.now().toString();
  const organisation = `Synthetischer Browsertest ${suffix}`;
  const created = await page.request.post("/api/contacts", {
    headers: { Origin: "http://localhost:3100" },
    data: {
      organisation,
      firstName: "Anna",
      lastName: "Test",
      email: `anna.${suffix}@example.test`,
      confidence: "VERIFIED",
      verifiedAt: "2026-01-01T00:00:00.000Z",
      sourceUrl: "https://example.test/quelle",
      hook: "Dokumentierter synthetischer Bedarf an Projektfotos.",
      service: "Immobilienfotografie",
    },
  });
  expect(created.ok()).toBe(true);
  // Refresh the app snapshot after the synthetic fixture is created via the API.
  await page.reload();
  await page.getByRole("heading", { name: "Übersicht", exact: true }).waitFor();
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Kontakte/ })
    .click();
  await page.getByRole("button", { name: "Kontakte", exact: true }).click();
  await page.getByRole("button", { name: organisation, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeFocused();
  await dialog.getByRole("button", { name: /Entwurf vorbereiten/ }).click();
  await expect(dialog).not.toBeVisible();
  await page
    .locator(".draft-row")
    .filter({ hasText: organisation })
    .first()
    .click();
  const editor = page.getByRole("dialog");
  await expect(
    editor.getByRole("textbox", {
      name: "Vollständige Nachricht",
      exact: true,
    }),
  ).toHaveValue(/Nora Jeker/);
  await expect(
    editor.getByRole("button", { name: /Version 1 freigeben/ }),
  ).toBeDisabled();
  await editor.getByLabel(/Ich habe Empfänger/).check();
  await editor.getByRole("button", { name: /Version 1 freigeben/ }).click();
  await expect(editor.getByRole("alert")).toContainText("rechtliche");
  await page.keyboard.press("Escape");
  await expect(editor).not.toBeVisible();
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Kontakte/ })
    .click();
  await page.getByRole("button", { name: "Kontakte", exact: true }).click();
  await page.getByRole("button", { name: organisation, exact: true }).click();
  await dialog
    .getByLabel("Rechtsgrundlage und Nachweis")
    .fill(
      "Explizite synthetische Einwilligung für diesen Browsertest dokumentiert.",
    );
  await dialog
    .getByRole("button", { name: "Zulässigkeit dokumentieren" })
    .click();
  await expect(dialog).not.toBeVisible();
  await page.getByText("Weitere Ansichten", { exact: true }).click();
  await page
    .getByRole("navigation", { name: "Akquise-Navigation" })
    .getByRole("button", { name: /E-Mail-Entwürfe/ })
    .click();
  await page
    .locator(".draft-row")
    .filter({ hasText: organisation })
    .first()
    .click();
  await editor.getByLabel(/Ich habe Empfänger/).check();
  await editor.getByRole("button", { name: /Version 1 freigeben/ }).click();
  await expect(editor).not.toBeVisible();
  await page
    .locator(".draft-row")
    .filter({ hasText: organisation })
    .first()
    .click();
  await editor.getByRole("button", { name: "Lokal simulieren" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Keine E-Mail wurde versandt",
  );
  await editor
    .getByLabel("Betreff", { exact: true })
    .fill("Überarbeitete synthetische Nachricht");
  await expect(
    editor.getByRole("button", { name: /Version 1 freigeben/ }),
  ).toBeDisabled();
  await editor
    .getByRole("button", { name: "Als neue Version speichern" })
    .click();
  await expect(editor).not.toBeVisible();
  await page.locator(".draft-row").filter({ hasText: organisation }).click();
  await expect(editor.getByRole("heading", { level: 2 })).toContainText(
    "Version 2",
  );
  await expect(editor.getByLabel(/Ich habe Empfänger/)).not.toBeChecked();
});
test("Dashboard und Kontaktformular bestehen WCAG-AA-Automatikprüfung", async ({
  page,
}) => {
  await signIn(page);
  const dashboard = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(dashboard.violations).toEqual([]);
  await page.getByRole("button", { name: /Kontakt erfassen/ }).click();
  const form = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(form.violations).toEqual([]);
});

test("Dashboard opens each work area and keeps navigation available after project loading fails", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.route("**/api/dashboard", (route) =>
    route.fulfill({ status: 503, json: { error: "Synthetischer Ausfall" } }),
  );
  await signIn(page);
  await expect(
    page.locator(".dashboard-home").getByRole("alert"),
  ).toContainText("Projekte konnten nicht geladen werden");
  await page.unroute("**/api/dashboard");
  await page.getByRole("button", { name: "Projekte erneut laden" }).click();
  await expect(page.locator(".dashboard-home").getByRole("alert")).toHaveCount(
    0,
  );
  const main = page.getByRole("navigation", { name: "Hauptnavigation" });
  for (const [button, heading] of [
    ["Content erstellen öffnen", "Content-Studio"],
    ["Kampagnen öffnen", "Kampagnen"],
    ["Social Media öffnen", "Social Media"],
    ["Newsletter öffnen", "Newsletter"],
    ["Websites öffnen", "Website"],
    ["Kontakte & Akquise öffnen", "Mail-Studio"],
    ["Kunden", "Kunden"],
    ["Strategie & Konzepte", "Strategie & Konzepte"],
    ["Bibliothek", "Bibliothek"],
    ["Kalender", "Kalender"],
    ["Einstellungen", "Einstellungen"],
  ]) {
    await page
      .locator(".dashboard-home")
      .getByRole("button", { name: button, exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: heading, level: 1, exact: true }),
    ).toBeVisible();
    await main.getByRole("button", { name: /Übersicht/ }).click();
  }
});

test("Dashboard opens the selected campaign, content conversation and website without writing", async ({
  page,
}) => {
  test.setTimeout(120000);
  await signIn(page);
  const state = await (await page.request.get("/api/state")).json();
  const suffix = Date.now();
  const titles = [
    `Dashboard Kampagne ${suffix}`,
    `Dashboard Content ${suffix}`,
    `Dashboard Website ${suffix}`,
  ];
  async function create(path: string, data: unknown) {
    const response = await page.request.post(`/api/${path}`, {
      headers: { Origin: "http://localhost:3100" },
      data,
    });
    expect(response.ok(), await response.text()).toBe(true);
    return response.json();
  }
  const campaign = await create("hub/campaigns", {
    title: titles[0],
    goal: "Synthetische Navigation prüfen",
    audience: "Testpublikum",
    startsAt: "2026-01-01T10:00:00.000Z",
    endsAt: "2026-12-31T10:00:00.000Z",
    ownerId: state.user.id,
  });
  const series = await create("studio/series", {
    title: titles[1],
    topic: "Synthetische Projektprüfung",
    goal: "Testen",
    audience: "Testpublikum",
    tone: "Sachlich",
    offer: "",
    channels: ["LINKEDIN"],
    formats: ["1:1"],
    count: 1,
    campaignId: null,
    customerId: null,
    referenceAssetIds: [],
    brandRules: [],
  });
  const { blankWebsite } = await import("../../lib/websites/input");
  const website = await create("websites", {
    customerId: null,
    document: { ...structuredClone(blankWebsite), name: titles[2] },
  });
  const snapshotResponse = await page.request.get("/api/dashboard");
  expect(snapshotResponse.headers()["cache-control"]).toContain("no-store");
  const snapshot = await snapshotResponse.json();
  expect(snapshot.projects.map((p: { id: string }) => p.id)).toEqual(
    expect.arrayContaining([campaign.id, series.id, website.id]),
  );
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") writes.push(request.url());
  });
  await page.reload();
  await page.getByLabel("Projekt suchen").fill(titles[0]);
  await expect(page.locator(".dashboard-project-list li")).toHaveCount(1);
  await page
    .getByRole("button", { name: `Kampagne ${titles[0]} öffnen`, exact: true })
    .click();
  await expect(page.getByLabel("Kampagnentitel", { exact: true })).toHaveValue(
    titles[0],
  );
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Übersicht/ })
    .click();
  await page
    .getByRole("button", {
      name: `Content-Projekt ${titles[1]} öffnen`,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("combobox", { name: /Gespräch \/ Content-Serie/ }),
  ).toHaveValue(series.id);
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Übersicht/ })
    .click();
  await page
    .getByRole("button", { name: `Website ${titles[2]} öffnen`, exact: true })
    .click();
  await expect(page.getByLabel("Projektname", { exact: true })).toHaveValue(
    titles[2],
  );
  expect(writes).toEqual([]);
});
