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
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
}
test("API schützt Daten, Ursprung und externen Versand", async ({
  request,
}) => {
  const unauthorized = await request.get("/api/state");
  expect(unauthorized.status()).toBe(401);
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
      page.getByText("Persönlich ansprechen. Bewusst freigeben."),
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
      await page
        .getByRole("navigation")
        .getByRole("button", { name: new RegExp(section) })
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
  await page.getByRole("heading", { name: "Dashboard", exact: true }).waitFor();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Kontakte/ })
    .click();
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
    .getByRole("navigation")
    .getByRole("button", { name: /Kontakte/ })
    .click();
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
  await page
    .getByRole("navigation")
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
  await page
    .getByRole("button", { name: /Überarbeitete synthetische Nachricht/ })
    .click();
  await expect(editor.getByRole("heading")).toContainText("Version 2");
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
