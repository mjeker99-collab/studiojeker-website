import { test, expect } from "@playwright/test";

/**
 * Safety regression on synthetic contacts only: 100 drafts reach one shared
 * review. The approval endpoint is observed, never called or dispatched.
 */
test("100 verified contacts reach group review without any dispatch", async ({ page }) => {
  test.setTimeout(60000);
  const contacts = Array.from({ length: 100 }, (_, i) => ({
    id: `bulk-${i}`,
    revision: 1,
    organisation: `Betrieb ${i}`,
    firstName: "Nina",
    lastName: `Test${i}`,
    email: `nina${i}@example.test`,
    status: "NEW",
  }));
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
            ready: true,
            changed: false,
            patch: {},
            values: {},
            origins: [],
            issues: [],
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
  await page.getByRole("button", { name: /Kontakte\\/Akquise/ }).click();
  await page.getByRole("button", { name: "100 Kontakte auswählen", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "100 Kontakte ausgewählt", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "100 Mails erstellen →", exact: true }).click();
  await page.getByRole("button", { name: "Weiter zum Sofortversand →", exact: true }).click();
  await expect(
    page.getByText("Gemeinsame Versandprüfung für 100 ausgewählte Kontakte", {
      exact: true,
    }),
  ).toBeVisible();
  expect(preparedIds).toHaveLength(100);
  expect(new Set(preparedIds).size).toBe(100);
  await expect(
    page.getByRole("button", { name: "100 Mails jetzt senden", exact: true }),
  ).toBeDisabled();
  expect(approvalCalls).toBe(0);
});
