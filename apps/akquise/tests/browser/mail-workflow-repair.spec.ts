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
        await list
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
        page.getByText("2 Mails bereit · 1 Angaben offen · 2 ausgewählt", {
          exact: true,
        }),
      ).toBeVisible();
      await list
        .getByRole("button", { name: "Auswahl aufheben", exact: true })
        .click();
      await expect(
        page.getByText("2 Mails bereit · 1 Angaben offen · 0 ausgewählt", {
          exact: true,
        }),
      ).toBeVisible();
      await list
        .getByRole("button", {
          name: "Aus diesem Versand entfernen",
          exact: true,
        })
        .first()
        .click();
      await list
        .getByRole("button", {
          name: "Alle versandbereiten auswählen",
          exact: true,
        })
        .click();
      await expect(
        page.getByText("2 Mails bereit · 0 Angaben offen · 2 ausgewählt", {
          exact: true,
        }),
      ).toBeVisible();
      await page.reload();
      await page.getByRole("button", { name: /^Akquise$/ }).click();
      await expect(
        page.getByText("2 Mails bereit · 0 Angaben offen · 2 ausgewählt", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByLabel(/Ich gebe die 2 ausgewählten/),
      ).not.toBeChecked();
    }
  });
}
