import { test, expect } from "@playwright/test";

test("50 selected contacts stay together through shared completion and review", async ({
  page,
}) => {
  test.setTimeout(45000);
  await page.setViewportSize({ width: 1366, height: 1024 });
  await page.clock.setFixedTime(new Date("2026-11-02T10:47:00Z"));
  let saved = false;
  let prepared = 0;
  let releasePreparation!: () => void;
  const preparationWait = new Promise<void>((resolve) => {
    releasePreparation = resolve;
  });
  let markPreparationStarted!: () => void;
  const preparationStarted = new Promise<void>((resolve) => {
    markPreparationStarted = resolve;
  });
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
              sourceUrl: saved ? "https://Search.ch" : "",
              verifiedAt: saved ? "2026-10-28T00:00:00.000Z" : "",
              confidence: saved ? "VERIFIED" : "UNCONFIRMED",
              hook: saved ? "Recherche Firmenwebseite" : "",
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
      expect(body.shared.sourceUrl).toBe("https://Search.ch");
      expect(body.shared.hook).toBe("Recherche Firmenwebseite");
      expect(body.shared.verifiedAt).toBe("2026-10-28T00:00:00.000Z");
      saved = body.shared.confidence === "VERIFIED";
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
      markPreparationStarted();
      await preparationWait;
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
      name: "Sofort senden (50) →",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("50 Kontakte bleiben ausgewählt.", { exact: true }),
  ).toBeVisible();
  expect(prepared).toBe(0);
  await expect(
    page.getByRole("button", {
      name: "Weiter zum Sofortversand →",
      exact: true,
    }),
  ).toBeDisabled();
  const shared = page.getByRole("group", {
    name: "Gemeinsame Angaben für die Auswahl",
    exact: true,
  });
  await expect(
    shared.getByRole("combobox", { name: "Prüfstatus" }),
  ).toHaveCount(0);
  await shared.getByLabel("Quellen-URL").fill("https://Search.ch");
  await shared
    .getByLabel("Dokumentierter Anknüpfungspunkt")
    .fill("Recherche Firmenwebseite");
  // Reproduce the screenshot: a future date must produce an actionable error,
  // never a misleading successful save with all 50 still blocked.
  await shared.getByLabel("Prüfdatum").fill("2026-11-28");
  await page.getByLabel(/Ich habe die persönlichen E-Mail-Adressen/).check();
  await page
    .getByRole("button", { name: "Weiter zum Sofortversand →", exact: true })
    .click();
  await expect(page.locator(".contact-preparation").getByRole("alert")).toContainText(
    "Prüfdatum liegt in der Zukunft",
  );
  expect(saved).toBe(false);
  await expect(shared.getByLabel("Quellen-URL")).toHaveValue(
    "https://Search.ch",
  );
  await shared.getByLabel("Prüfdatum").fill("2026-10-28");
  await expect(
    page.getByRole("button", {
      name: "Weiter zum Sofortversand →",
      exact: true,
    }),
  ).toBeDisabled();
  await page.screenshot({
    path: ".local/mailstudio-confirmation-ipad.png",
    fullPage: true,
  });
  await page.getByLabel(/Ich habe die persönlichen E-Mail-Adressen/).check();
  await page
    .getByRole("button", {
      name: "Weiter zum Sofortversand →",
      exact: true,
    })
    .click();
  await preparationStarted;
  try {
    await expect(
      page.getByText("Persönliche Mails werden vorbereitet …", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Globale Mailprüfung" }),
    ).toHaveCount(0);
  } finally {
    releasePreparation();
  }
  await expect(
    page.getByText("Gemeinsame Versandprüfung für 50 ausgewählte Kontakte", {
      exact: true,
    }),
  ).toBeVisible();
  expect(prepared).toBe(50);
  await expect(
    page.getByRole("button", { name: "Alle 50 jetzt senden", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Rechtsgrundlage und Nachweis")
    .fill("Dokumentierte Einwilligung für alle synthetischen Testkontakte.");
  await page
    .getByLabel(/Ich gebe die 50 ausgewählten persönlichen Mails/)
    .check();
  await page
    .getByRole("button", { name: "Alle 50 jetzt senden", exact: true })
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
  await page.getByRole("button", { name: "Sofort senden (2) →", exact: true }).click();
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
  await page.getByRole("button", { name: "Sofort senden (4) →", exact: true }).click();
  await expect(page.getByRole("heading", { name: "1 Nachrichten in der Prüfvorschau" })).toBeVisible();
  await expect(page.getByText(/3 Kontakte zurückgestellt/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Jetzt senden", exact: true })).toBeDisabled();
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


test("saved info@ drafts cannot enter bulk mail approval", async ({ page }) => {
  const contacts = [
    { id: "good", revision: 1, organisation: "Marketing", firstName: "Mia", lastName: "Test", email: "marketing@example.test", status: "NEW" },
    { id: "info", revision: 1, organisation: "Info", firstName: "Ina", lastName: "Test", email: "info@example.test", status: "NEW" },
    { id: "stale", revision: 1, organisation: "Changed", firstName: "Ada", lastName: "Test", email: "kommunikation@example.test", status: "NEW" },
  ];
  const makeDraft = (id: string, contactId: string, recipient: string) => ({
    id, contactId, version: 1,
    versions: [{ version: 1, recipient, subject: "Persönliches Angebot", signatureCurrent: true }],
    approvals: [],
  });
  const drafts = [
    makeDraft("d-good", "good", "marketing@example.test"),
    makeDraft("d-info", "info", "info@example.test"),
    // Contact was updated, but the old draft still contains an info@ recipient.
    makeDraft("d-stale", "stale", "INFO+old@example.test"),
  ];
  let previewIds: string[] = [];
  let dispatchCalls = 0;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = route.request().method() === "POST" ? route.request().postDataJSON() : {};
    if (path === "/api/state") return route.fulfill({ json: {
      user: { id: "test", name: "Test" }, users: [], contacts, drafts,
      deliveries: [], suppressions: [], audits: [],
      generator: "disabled", externalSending: false, mailMode: "disabled",
    } });
    if (path === "/api/hub/state") return route.fulfill({ json: {
      campaigns: [], contents: [], users: [], drafts: [], customers: [],
      integrations: {}, events: [],
    } });
    if (path === "/api/mail-review/preview") {
      previewIds = body.ids;
      return route.fulfill({ json: { rows: body.ids.map((id: string) => ({
        id, version: 1, hash: "a".repeat(64), contactRevision: 1,
        recipient: "marketing@example.test", subject: "Persönliches Angebot",
        body: "Guten Tag", organisation: "Marketing", publicAuthority: false,
        needsLegal: true, issues: [],
      })) } });
    }
    if (path.startsWith("/api/mail-review/approve")) dispatchCalls += 1;
    return route.fulfill({ status: 503, json: { error: "Not used in selection test" } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Kontakte\/Akquise/ }).click();
  await expect(page.getByRole("button", { name: "Gespeicherte Entwürfe öffnen (1)" })).toBeVisible();
  await page.getByRole("button", { name: "Gespeicherte Entwürfe öffnen (1)" }).click();
  await expect(page.getByRole("heading", { name: "1 persönliche Mails vorhanden" })).toBeVisible();
  await page.getByRole("button", { name: "1 Mails gemeinsam freigeben →" }).click();
  await expect(page.getByRole("heading", { name: "1 Nachrichten in der Prüfvorschau" })).toBeVisible();
  expect(previewIds).toEqual(["d-good"]);
  expect(dispatchCalls).toBe(0);
});

test("45 ready contacts continue and 5 blocked contacts show the exact reason", async ({ page }) => {
  const contacts = Array.from({ length: 50 }, (_, i) => ({
    id: `b${i}`,
    revision: 1,
    organisation: `Betrieb ${i}`,
    firstName: "Sara",
    lastName: `Test${i}`,
    email: i < 45 ? `sara${i}@example.test` : `marketing${i}@example.test`,
    status: "NEW",
  }));
  let prepared: string[] = [];
  let dispatchCalls = 0;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = route.request().method() === "POST" ? route.request().postDataJSON() : {};
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
    if (path === "/api/studio/state" || path === "/api/mail-schedule")
      return route.fulfill({ status: 503, json: { error: "Not used" } });
    if (path.endsWith("/preparation/preview"))
      return route.fulfill({
        json: {
          contacts: body.ids.map((id: string) => {
            const blocked = Number(id.slice(1)) >= 45;
            return {
              id,
              revision: 1,
              organisation: `Betrieb ${id.slice(1)}`,
              name: "Sara Test",
              email: blocked ? `marketing${id.slice(1)}@example.test` : `sara${id.slice(1)}@example.test`,
              ready: !blocked,
              changed: false,
              patch: {},
              values: {},
              origins: [],
              issues: blocked
                ? ["Team-Postfach. Für den persönlichen Versand nicht freigabefähig."]
                : [],
            };
          }),
        },
      });
    if (path.endsWith("/preparation/prepare")) {
      prepared = body.contacts.map((c: { id: string }) => c.id);
      return route.fulfill({
        json: {
          results: prepared.map((id) => ({ id, ok: true, draftId: `d${id}` })),
        },
      });
    }
    if (path === "/api/mail-review/preview")
      return route.fulfill({
        json: {
          rows: body.ids.map((id: string) => ({
            id,
            version: 1,
            hash: "a".repeat(64),
            contactRevision: 1,
            recipient: "sara@example.test",
            subject: "Persönlicher Entwurf",
            body: "Guten Tag",
            organisation: "Betrieb",
            publicAuthority: false,
            needsLegal: true,
            issues: [],
          })),
        },
      });
    if (path.startsWith("/api/mail-review/approve")) dispatchCalls += 1;
    return route.fulfill({ json: [] });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: /Kontakte\/Akquise/ }).click();
  await page.getByRole("button", { name: "50 Kontakte auswählen", exact: true }).click();
  const send = page.getByRole("button", { name: "Sofort senden (50) →", exact: true });
  const box = await send.boundingBox();
  expect(box !== null && box.y >= 0 && box.y < 844).toBe(true);
  await page.screenshot({ path: ".local/mailstudio-50-mobile.png" });
  await send.click();
  await expect(
    page.getByText(
      "5 Kontakte: Team-Postfach. Für den persönlichen Versand nicht freigabefähig.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "45 Nachrichten in der Prüfvorschau" }),
  ).toBeVisible();
  expect(prepared).toHaveLength(45);
  expect(prepared.every((id) => Number(id.slice(1)) < 45)).toBe(true);
  expect(dispatchCalls).toBe(0);
  await page.screenshot({ path: ".local/mailstudio-45-ready-mobile.png" });
});

test("a fully blocked selection explains the reason and returns without sending", async ({ page }) => {
  const contacts = [0, 1].map((i) => ({
    id: `t${i}`,
    revision: 1,
    organisation: `Team ${i}`,
    firstName: "Tina",
    lastName: "Test",
    email: `kommunikation${i}@example.test`,
    status: "NEW",
  }));
  let dispatchCalls = 0;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = route.request().method() === "POST" ? route.request().postDataJSON() : {};
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
    if (path.endsWith("/preparation/preview"))
      return route.fulfill({
        json: {
          contacts: body.ids.map((id: string) => ({
            id,
            revision: 1,
            organisation: "Team",
            name: "Tina Test",
            email: "kommunikation@example.test",
            ready: false,
            changed: false,
            patch: {},
            values: {},
            origins: [],
            issues: ["Team-Postfach. Für den persönlichen Versand nicht freigabefähig."],
          })),
        },
      });
    if (path.startsWith("/api/mail-review/approve") || path.endsWith("/preparation/prepare"))
      dispatchCalls += 1;
    return route.fulfill({ status: 503, json: { error: "Not used" } });
  });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");
  await page.getByRole("button", { name: /Kontakte\/Akquise/ }).click();
  await page.getByRole("button", { name: "25 Kontakte auswählen", exact: true }).click();
  await page.getByRole("button", { name: "Sofort senden (2) →", exact: true }).click();
  await expect(page.getByText("Noch nicht bereit: 2 von 2")).toBeVisible();
  await page.screenshot({ path: ".local/mailstudio-blocked-ipad.png" });
  await expect(
    page.getByText(
      "2 Kontakte: Team-Postfach. Für den persönlichen Versand nicht freigabefähig.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Zurück zur Auswahl", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "0 Kontakte ausgewählt", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Keine versandfähige Teilmenge/)).toBeVisible();
  expect(dispatchCalls).toBe(0);
});

test("changing the master filter clears the hidden mail selection", async ({ page }) => {
  const contacts = [
    { id: "a", revision: 1, organisation: "Alpha", firstName: "Ana", lastName: "A", email: "ana@example.test", industry: "Bau", status: "NEW" },
    { id: "b", revision: 1, organisation: "Beta", firstName: "Ben", lastName: "B", email: "ben@example.test", industry: "Holz", status: "NEW" },
  ];
  let preparationCalls = 0;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
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
    if (path.includes("/preparation/")) preparationCalls += 1;
    return route.fulfill({ status: 503, json: { error: "Not used" } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Kontakte\/Akquise/ }).click();
  await page.getByRole("button", { name: "25 Kontakte auswählen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "2 Kontakte ausgewählt" })).toBeVisible();
  await page.getByRole("combobox", { name: "Branche", exact: true }).selectOption("Holz");
  await expect(page.getByRole("heading", { name: "0 Kontakte ausgewählt" })).toBeVisible();
  await expect(page.getByText(/1 Kontakte mit E-Mail-Adresse/)).toBeVisible();
  await page.getByRole("button", { name: "25 Kontakte auswählen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "1 Kontakte ausgewählt" })).toBeVisible();
  expect(preparationCalls).toBe(0);
});
