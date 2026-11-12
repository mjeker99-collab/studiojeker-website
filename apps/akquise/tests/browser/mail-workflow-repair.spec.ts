import { checkout } from "./mail-checkout-helper";
import { test, expect } from "@playwright/test";
import { setup } from "./mail-assistant-fixture";

for (const allBlocked of [false, true]) {
  test(`blocked contacts remain removable, all blocked=${allBlocked}`, async ({
    page,
  }) => {
    await setup(page);
    await page.route("**/api/mail-review/preview", (route) => {
      const { ids } = route.request().postDataJSON();
      return route.fulfill({
        json: {
          rows: ids.map((id: string) => ({
            id,
            contactId: `c${id.slice(1)}`,
            version: 1,
            hash: "a".repeat(64),
            contactRevision: 1,
            recipient: `anna${id.slice(1)}@example.test`,
            organisation: `Atelier ${id.slice(1)}`,
            subject: "Persönliche Anfrage",
            body: "Guten Tag",
            publicAuthority: false,
            needsLegal: false,
            issues: allBlocked || id === "d0" ? ["Quellen-URL fehlt."] : [],
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
    const list = page.getByRole("navigation", { name: "Mail-Empfänger" });
    if (allBlocked) {
      await expect(
        page.getByRole("region", { name: "Versandfreigabe" }),
      ).toHaveCount(0);
      for (let n = 0; n < 3; n++)
        await page
          .locator(".mail-preview-pane")
          .getByRole("button", {
            name: "Aus diesem Versand entfernen",
            exact: true,
          })
          .first()
          .click();
      await expect(
        page.getByText(/Keine Mails in diesem Vorgang/),
      ).toBeVisible();
    } else {
      await expect(
        page.getByText("2 Mails vorbereitet · 1 Angaben offen · 2 ausgewählt", {
          exact: true,
        }),
      ).toBeVisible();
      await list
        .getByRole("button", { name: "Auswahl aufheben", exact: true })
        .click();
      await expect(
        page.getByText("2 Mails vorbereitet · 1 Angaben offen · 0 ausgewählt", {
          exact: true,
        }),
      ).toBeVisible();
      await page
        .locator(".mail-preview-pane")
        .getByRole("button", {
          name: "Aus diesem Versand entfernen",
          exact: true,
        })
        .first()
        .click();
      await list
        .getByRole("button", {
          name: "Alle vorbereiteten Mails auswählen",
          exact: true,
        })
        .click();
      await expect(
        page.getByText("2 Mails vorbereitet · 0 Angaben offen · 2 ausgewählt", {
          exact: true,
        }),
      ).toBeVisible();
      await page.reload();
      await page.getByRole("button", { name: /^Akquise$/ }).click();
      await expect(
        page.getByText("2 Mails vorbereitet · 0 Angaben offen · 2 ausgewählt", {
          exact: true,
        }),
      ).toBeVisible();
      await checkout(page);
      await expect(
        page.getByLabel(/Ich gebe die 2 ausgewählten/),
      ).not.toBeChecked();
    }
  });
}

test("99 ready mails proceed with one incomplete contact, without releasing the incomplete mail", async ({
  page,
}) => {
  await setup(page);
  const contacts = Array.from({ length: 100 }, (_, i) => ({
    id: `c${i}`,
    revision: 1,
    organisation: `Betrieb ${i}`,
    firstName: "Anna",
    lastName: "Test",
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
        recipient: c.email,
        subject: `Anfrage ${i}`,
        signatureCurrent: true,
      },
    ],
    approvals: [],
  }));
  await page.route("**/api/state", (route) =>
    route.fulfill({
      json: {
        user: { id: "hundred", name: "Test" },
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
    }),
  );
  await page.route("**/api/mail-review/preview", (route) => {
    const { ids } = route.request().postDataJSON();
    return route.fulfill({
      json: {
        rows: ids.map((id: string) => ({
          id,
          contactId: `c${id.slice(1)}`,
          version: 1,
          hash: "a".repeat(64),
          contactRevision: 1,
          recipient: `anna${id.slice(1)}@example.test`,
          organisation: `Betrieb ${id.slice(1)}`,
          subject: "Anfrage",
          body: "Guten Tag",
          publicAuthority: false,
          needsLegal: false,
          issues: id === "d0" ? ["Quelle fehlt"] : [],
        })),
      },
    });
  });
  let released: string[] = [];
  await page.route("**/api/mail-review/approve-and-enqueue", (route) => {
    const body = route.request().postDataJSON();
    expect(body.read).toBe(true);
    expect(body.confirmDispatch).toBe(true);
    released = body.items.map((i: { id: string }) => i.id);
    return route.fulfill({
      json: {
        results: released.map((id) => ({
          id,
          ok: true,
          message: "Eingeplant",
        })),
      },
    });
  });
  await page.reload();
  await page.getByRole("button", { name: /^Akquise$/ }).click();
  await page
    .getByRole("button", {
      name: "Gespeicherte Entwürfe öffnen (100)",
      exact: true,
    })
    .click();
  await checkout(page);
  await expect(
    page.getByText("99 Mails vorbereitet · 1 Angaben offen · 99 ausgewählt", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel(/Ich gebe die 99 ausgewählten/).check();
  await checkout(page);
  await page
    .getByRole("button", { name: "99 Mails einplanen", exact: true })
    .click();
  await expect.poll(() => released.length).toBe(99);
  expect(released).not.toContain("d0");
});
