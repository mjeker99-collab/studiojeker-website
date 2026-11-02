import { test, expect } from "@playwright/test";

test("50 selected contacts stay together through shared completion and review", async ({
  page,
}) => {
  test.setTimeout(45000);
  let saved = false;
  let prepared = 0;
  const sent: string[] = [];
  const contacts = Array.from({ length: 50 }, (_, i) => ({
    id: `c${i}`,
    revision: 1,
    organisation: `Atelier ${i}`,
    firstName: "Anna",
    lastName: `Muster${i}`,
    email: `anna${i}@example.test`,
    status: "NEW",
  }));
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
          users: [],
          drafts: [],
          customers: [],
          integrations: {},
          events: [],
        },
      });
    if (path === "/api/studio/state")
      return route.fulfill({ status: 503, json: { error: "Not used" } });
    if (path === "/api/mail-schedule")
      return route.fulfill({
        status: 503,
        json: { error: "Scheduler not used in this test" },
      });
    if (path.endsWith("/preparation/preview"))
      return route.fulfill({
        json: {
          contacts: body.ids.map((id: string, i: number) => ({
            ...contacts.find((c) => c.id === id),
            name: "Anna Muster",
            ready: saved,
            changed: false,
            patch: {},
            values: {
              sourceUrl: "https://example.test/team",
              verifiedAt: "2026-10-17T00:00:00.000Z",
              confidence: saved ? "VERIFIED" : "UNCONFIRMED",
              hook: "Dokumentierter Bedarf",
            },
            origins: [],
            issues:
              saved || i === 0
                ? []
                : ["Persönliche Adresse noch nicht als verifiziert bestätigt."],
          })),
        },
      });
    if (path.endsWith("/preparation/save")) {
      expect(body.contacts).toHaveLength(50);
      expect(body.shared.confidence).toBe("VERIFIED");
      saved = true;
      return route.fulfill({
        json: {
          results: contacts.map((c) => ({
            id: c.id,
            ok: true,
            message: "Gespeichert",
          })),
        },
      });
    }
    if (path.endsWith("/preparation/prepare")) {
      prepared = body.contacts.length;
      expect(saved).toBe(true);
      expect(prepared).toBe(50);
      return route.fulfill({
        json: {
          results: contacts.map((c) => ({
            id: c.id,
            ok: true,
            draftId: `d${c.id}`,
          })),
        },
      });
    }
    if (path === "/api/mail-review/approve-and-send") {
      expect(body.confirmDispatch).toBe(true);
      expect(body.legal.confirmed).toBe(true);
      sent.push(...body.items.map((item: { id: string }) => item.id));
      return route.fulfill({
        json: {
          results: body.items.map((item: { id: string }) => ({
            id: item.id,
            ok: true,
            message: "Simulierter Versand",
          })),
        },
      });
    }
    if (path === "/api/mail-review/preview")
      return route.fulfill({
        json: {
          rows: body.ids.map((id: string, i: number) => ({
            id,
            version: 1,
            hash: "test",
            contactRevision: 1,
            recipient: `anna${i}@example.test`,
            subject: "Persönlicher Betreff",
            body: "Guten Tag\n\nPersönlicher Text",
            organisation: `Atelier ${i}`,
            publicAuthority: false,
            needsLegal: true,
            issues: [],
          })),
        },
      });
    return route.fulfill({ json: [] });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Kontakte\/Akquise/ }).click();
  await page
    .getByRole("button", { name: "50 Kontakte auswählen", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "50 persönliche Mails vorbereiten →",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("50 Kontakte bleiben ausgewählt.", { exact: true }),
  ).toBeVisible();
  expect(prepared).toBe(0);
  await expect(
    page.getByRole("button", { name: "Weiter zur Mailprüfung →", exact: true }),
  ).toBeDisabled();
  const shared = page.getByRole("group", {
    name: "Gemeinsame Angaben für die Auswahl",
    exact: true,
  });
  await shared
    .getByRole("combobox", { name: "Prüfstatus", exact: true })
    .selectOption("VERIFIED");
  await page.getByLabel(/Ich bestätige die eingetragenen Angaben/).check();
  await page
    .getByRole("button", {
      name: "Angaben für alle speichern und weiter →",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Gemeinsame Versandprüfung für 50 ausgewählte Kontakte", {
      exact: true,
    }),
  ).toBeVisible();
  expect(prepared).toBe(50);
  await expect(
    page.getByRole("button", { name: "Sofort senden", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Rechtsgrundlage und Nachweis")
    .fill("Dokumentierte Einwilligung für alle synthetischen Testkontakte.");
  await page.getByLabel(/Ich bestätige die Zulässigkeit/).check();
  await page
    .getByLabel(/Ich gebe die 50 ausgewählten persönlichen Mails/)
    .check();
  await page
    .getByRole("button", { name: "Sofort senden", exact: true })
    .click();
  await expect(
    page.getByText("50 von 50 Mails bearbeitet.", { exact: true }),
  ).toBeVisible();
  expect(new Set(sent).size).toBe(50);
  expect(sent).toHaveLength(50);
  await page
    .getByRole("button", { name: "Auswahl zurücksetzen", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "0 Kontakte ausgewählt", exact: true }),
  ).toBeVisible();
});


test("partly prepared group reviews successful drafts without retrying or sending failed contacts", async ({ page }) => {
  const contacts = [
    { id: "p1", revision: 1, organisation: "Atelier Eins", firstName: "Anna", lastName: "Test", email: "anna@example.test", status: "NEW" },
    { id: "p2", revision: 1, organisation: "Atelier Zwei", firstName: "Ben", lastName: "Test", email: "ben@example.test", status: "NEW" },
  ];
  let preparationCalls = 0;
  let dispatchCalls = 0;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = route.request().method() === "POST" ? route.request().postDataJSON() : {};
    if (path === "/api/state") return route.fulfill({ json: {
      user: { id: "test", name: "Test" }, users: [], contacts, drafts: [],
      deliveries: [], suppressions: [], audits: [],
      generator: "disabled", externalSending: false, mailMode: "disabled",
    } });
    if (path === "/api/hub/state") return route.fulfill({ json: {
      campaigns: [], contents: [], users: [], drafts: [], customers: [],
      integrations: {}, events: [],
    } });
    if (path === "/api/studio/state") return route.fulfill({ status: 503, json: { error: "Not used" } });
    if (path === "/api/mail-schedule") return route.fulfill({ status: 503, json: { error: "Not used" } });
    if (path.endsWith("/preparation/preview")) return route.fulfill({ json: {
      contacts: body.ids.map((id: string) => ({
        ...contacts.find((c) => c.id === id), name: "Testkontakt", ready: true,
        changed: false, patch: {}, values: {}, origins: [], issues: [],
      })),
    } });
    if (path.endsWith("/preparation/prepare")) {
      preparationCalls++;
      expect(body.contacts).toHaveLength(2);
      return route.fulfill({ json: { results: [
        { id: "p1", ok: true, draftId: "d1", message: "Entwurf bereit" },
        { id: "p2", ok: false, message: "Atelier Zwei: Adresse erneut prüfen" },
      ] } });
    }
    if (path === "/api/mail-review/preview") {
      expect(body.ids).toEqual(["d1"]);
      return route.fulfill({ json: { rows: [{
        id: "d1", version: 1, hash: "a".repeat(64), contactRevision: 1,
        recipient: "anna@example.test", subject: "Persönlicher Entwurf",
        body: "Guten Tag", organisation: "Atelier Eins",
        publicAuthority: false, needsLegal: true, issues: [],
      }] } });
    }
    if (path.startsWith("/api/mail-review/approve")) dispatchCalls++;
    return route.fulfill({ json: [] });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Kontakte\/Akquise/ }).click();
  await page.getByRole("button", { name: "25 Kontakte auswählen", exact: true }).click();
  await page.getByRole("button", { name: "2 persönliche Mails vorbereiten →", exact: true }).click();
  await expect(page.getByRole("heading", { name: "1 Nachrichten in der Prüfvorschau" })).toBeVisible();
  await expect(page.getByText(/1 Mails bereit/)).toBeVisible();
  await expect(page.getByText(/1 Kontakte zurückgestellt/)).toBeVisible();
  expect(preparationCalls).toBe(1);
  expect(dispatchCalls).toBe(0);
});


test("mixed contact group advances only verified unchanged records without sending", async ({ page }) => {
  const contacts = Array.from({ length: 4 }, (_, i) => ({
    id: `m${i}`, revision: 1, organisation: `Atelier ${i}`,
    firstName: "Anna", lastName: `Muster${i}`,
    email: `anna${i}@example.test`, status: "NEW",
  }));
  let preparedIds: string[] = [];
  let dispatchCalls = 0;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = route.request().method() === "POST" ? route.request().postDataJSON() : {};
    if (path === "/api/state") return route.fulfill({ json: {
      user: { id: "test", name: "Test" }, users: [], contacts,
      drafts: [], deliveries: [], suppressions: [], audits: [],
      generator: "disabled", externalSending: false, mailMode: "disabled",
    } });
    if (path === "/api/hub/state") return route.fulfill({ json: {
      campaigns: [], contents: [], users: [], drafts: [],
      customers: [], integrations: {}, events: [],
    } });
    if (path === "/api/studio/state") return route.fulfill({
      status: 503, json: { error: "Not used" },
    });
    if (path === "/api/mail-schedule") return route.fulfill({
      status: 503, json: { error: "Not used" },
    });
    if (path.endsWith("/preparation/preview")) return route.fulfill({ json: {
      contacts: body.ids.map((id: string) => {
        const unchanged = id === "m0";
        const proposed = id === "m3";
        return {
          ...contacts.find((c) => c.id === id),
          name: "Anna Muster", ready: unchanged || proposed,
          changed: proposed, patch: proposed ? { hook: "Unbestätigter Hinweis" } : {},
          values: {}, origins: [],
          issues: unchanged || proposed ? [] : ["Quelle und Verifikation fehlen."],
        };
      }),
    } });
    if (path.endsWith("/preparation/prepare")) {
      preparedIds = body.contacts.map((c: { id: string }) => c.id);
      expect(preparedIds).toEqual(["m0"]);
      return route.fulfill({ json: { results: [
        { id: "m0", ok: true, draftId: "draft-m0", message: "Entwurf bereit" },
      ] } });
    }
    if (path === "/api/mail-review/preview") {
      expect(body.ids).toEqual(["draft-m0"]);
      return route.fulfill({ json: { rows: [{
        id: "draft-m0", version: 1, hash: "a".repeat(64),
        contactRevision: 1, recipient: "anna0@example.test",
        subject: "Persönlicher Entwurf", body: "Guten Tag",
        organisation: "Atelier 0", publicAuthority: false,
        needsLegal: true, issues: [],
      }] } });
    }
    if (path.startsWith("/api/mail-review/approve")) {
      dispatchCalls += 1;
      return route.fulfill({ status: 403, json: { error: "Blocked" } });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Kontakte\/Akquise/ }).click();
  await page.getByRole("button", { name: "25 Kontakte auswählen", exact: true }).click();
  await page.getByRole("button", { name: "4 persönliche Mails vorbereiten →", exact: true }).click();
  await expect(page.getByRole("heading", { name: "1 Nachrichten in der Prüfvorschau" })).toBeVisible();
  await expect(page.getByText(/3 Kontakte zurückgestellt/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Sofort senden", exact: true })).toBeDisabled();
  expect(preparedIds).toEqual(["m0"]);
  expect(dispatchCalls).toBe(0);
});

test("bulk selection skips info@ addresses while retaining other valid contacts", async ({ page }) => {
  const contacts = [
    { id: "p", revision: 1, organisation: "Atelier", firstName: "Anna", lastName: "Test", email: "anna@example.test", status: "NEW" },
    { id: "m", revision: 1, organisation: "Marketing", firstName: "Mia", lastName: "Test", email: "marketing@example.test", status: "NEW" },
    { id: "i", revision: 1, organisation: "Info", firstName: "Ivo", lastName: "Test", email: "info@example.test", status: "NEW" },
    { id: "i2", revision: 1, organisation: "Info Team", firstName: "Ina", lastName: "Test", email: "INFO+team@example.test", status: "NEW" },
  ];
  let mailCalls = 0;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/state") return route.fulfill({ json: {
      user: { id: "test", name: "Test" }, users: [], contacts,
      drafts: [], deliveries: [], suppressions: [], audits: [],
      generator: "disabled", externalSending: false, mailMode: "disabled",
    } });
    if (path === "/api/hub/state") return route.fulfill({ json: {
      campaigns: [], contents: [], users: [], drafts: [],
      customers: [], integrations: {}, events: [],
    } });
    if (path.includes("mail-review") || path.includes("/preparation/")) mailCalls += 1;
    return route.fulfill({ status: 503, json: { error: "Not used" } });
  });

  await page.goto("/");
  await page.getByRole("button", { name: /Kontakte\/Akquise/ }).click();
  await expect(page.getByText(/2 Kontakte mit E-Mail-Adresse für die Auswahl verfügbar/)).toBeVisible();
  await page.getByRole("button", { name: "25 Kontakte auswählen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "2 Kontakte ausgewählt" })).toBeVisible();
  await page.getByText(/Auswahl einzeln anpassen/).click();
  await expect(page.getByText(/2 info@-Adressen von der Auswahl ausgeschlossen/)).toBeVisible();
  expect(mailCalls).toBe(0);
});
