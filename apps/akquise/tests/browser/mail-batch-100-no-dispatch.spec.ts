import { test, expect } from "@playwright/test";

/**
 * Safety regression on synthetic contacts only: 25, 97 and 100 drafts reach a shared
 * review. The approval endpoint is observed, never called or dispatched.
 */
for (const contactCount of [25, 97, 100]) {
  test(`${contactCount} verified contacts reach group review without any dispatch`, async ({ page }) => {
  test.setTimeout(60000);
  const contacts = Array.from({ length: contactCount }, (_, i) => ({
    id: `bulk-${i}`,
    revision: 1,
    organisation: `Betrieb ${i}`,
    firstName: "Nina",
    lastName: `Test${i}`,
    email: `nina${i}@example.test`,
    status: "NEW",
  }));
  let saved = false;
  let preparedIds: string[] = [];
  let approvalCalls = 0;

  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body =
      route.request().method() === "POST" ? route.request().postDataJSON() : {};
    if (path === "/api/state") {
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
    }
    if (path === "/api/hub/state") {
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
    }
    if (path === "/api/studio/state" || path === "/api/mail-schedule") {
      return route.fulfill({ status: 503, json: { error: "Not used" } });
    }
    if (path.endsWith("/preparation/preview")) {
      return route.fulfill({
        json: {
          contacts: body.ids.map((id: string) => ({
            ...contacts.find((contact) => contact.id === id),
            name: "Nina Test",
            ready: saved,
            changed: false,
            patch: {},
            values: {
              sourceUrl: "https://example.test/team",
              verifiedAt: "2026-10-28T00:00:00.000Z",
              confidence: "VERIFIED",
              hook: "Synthetische Firmenrecherche",
            },
            origins: [],
            issues: saved ? [] : ["Rechercheangaben bestätigen."],
          })),
        },
      });
    }
    if (path.endsWith("/preparation/save")) {
      expect(body.contacts).toHaveLength(contactCount);
      expect(body.confirmed).toBe(true);
      saved = true;
      return route.fulfill({
        json: {
          results: contacts.map((contact) => ({
            id: contact.id,
            ok: true,
            message: "Synthetisch bestätigt",
          })),
        },
      });
    }
    if (path.endsWith("/preparation/prepare")) {
      preparedIds = body.contacts.map((contact: { id: string }) => contact.id);
      return route.fulfill({
        json: {
          results: preparedIds.map((id) => ({
            id,
            ok: true,
            draftId: `draft-${id}`,
          })),
        },
      });
    }
    if (path === "/api/mail-review/preview") {
      return route.fulfill({
        json: {
          rows: body.ids.map((id: string, i: number) => ({
            id,
            version: 1,
            hash: "a".repeat(64),
            contactRevision: 1,
            recipient: `nina${i}@example.test`,
            subject: "Individueller Entwurf",
            body: "Guten Tag",
            organisation: `Betrieb ${i}`,
            publicAuthority: false,
            needsLegal: true,
            issues: [],
          })),
        },
      });
    }
    if (path.startsWith("/api/mail-review/approve")) {
      approvalCalls += 1;
      return route.fulfill({
        status: 403,
        json: { error: "SMTP disabled in synthetic test" },
      });
    }
    return route.fulfill({ json: [] });
  });

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");
  await page.getByRole("button", { name: "Akquise", exact: false }).click();
  await page.getByRole("button", { name: `${contactCount} Kontakte auswählen`, exact: true }).click();
  await expect(
    page.getByRole("heading", { name: `${contactCount} Kontakte ausgewählt`, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: `${contactCount} Mails erstellen →`, exact: true }).click();
  await page.getByRole("button", { name: "Offene Angaben bearbeiten", exact: true }).click();
  await page.getByLabel(new RegExp(`Ich habe die persönlichen E-Mail-Adressen der ${contactCount} ausgewählten Kontakte`)).check();
  await page.getByRole("button", { name: "Angaben speichern und weiter →", exact: true }).click();
  await expect(
    page.getByText(`Noch eine Angabe für ${contactCount} ausgewählte Kontakte`, {
      exact: true,
    }),
  ).toBeVisible();
  expect(preparedIds).toHaveLength(contactCount);
  expect(new Set(preparedIds).size).toBe(contactCount);
  await expect(
    page.getByRole("button", { name: "Fehlende Versandangabe ergänzen", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Fehlende Versandangabe ergänzen", exact: true }).click();
  await expect(page.getByLabel("Rechtsgrundlage und Nachweis")).toBeFocused();
  expect(approvalCalls).toBe(0);
  });
}
