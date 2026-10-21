import { browserCredentials } from "./credentials";
import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import sharp from "sharp";
test("Bibliothek: Upload, Dublette, Texte, Links, Filter, Medienauswahl und iPad", async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  page.setDefaultTimeout(12000);
  const credentials = browserCredentials();
  const anon = await request.get("/api/library/state");
  expect(anon.status()).toBe(401);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.getByLabel("E-Mail", { exact: true }).fill(credentials.email);
  await page.getByLabel("Passwort", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: /Sicher anmelden/ }).click();
  const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
  await nav.getByRole("button", { name: /Bibliothek/ }).click();
  await expect(
    page.getByRole("heading", { name: "Bibliothek", exact: true, level: 2 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Google Drive", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Google Drive verbinden", exact: true }),
  ).toBeDisabled();
  await page.getByRole("checkbox", { name: /Ich darf die Dateien/ }).check();
  const buffer = await sharp({
    create: { width: 900, height: 650, channels: 3, background: "#204451" },
  })
    .composite([
      {
        input: Buffer.from(
          '<svg width="900" height="650"><circle cx="620" cy="260" r="190" fill="#00c8ff"/><rect x="100" y="430" width="600" height="100" fill="white"/></svg>',
        ),
      },
    ])
    .png()
    .toBuffer();
  await page.getByLabel("Dateien hochladen").setInputFiles([
    { name: "SYNTHETISCH-Bibliotheksbild.png", mimeType: "image/png", buffer },
    { name: "SYNTHETISCH-Kopie.png", mimeType: "image/png", buffer },
  ]);
  await expect(
    page.getByText(/Identische Datei vorhanden · wiederverwendet/),
  ).toBeVisible();
  const card = page
    .locator(".library-card")
    .filter({ hasText: "SYNTHETISCH-Bibliotheksbild.png" });
  await card.click();
  await page.getByLabel("Titel", { exact: true }).fill("SYNTHETISCH Bildmotiv");
  await page.getByLabel("Schlagwörter").fill("Architektur,Test");
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "gespeichert" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Text erfassen" }).click();
  await page
    .getByLabel("Titel", { exact: true })
    .fill("SYNTHETISCH Beispieltext");
  await page
    .getByLabel("Text", { exact: true })
    .fill("SYNTHETISCH: Ein freigegebenes Textbeispiel für interne Tests.");
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await page.getByRole("button", { name: "Link hinzufügen" }).click();
  await page
    .getByRole("combobox", { name: "Inhaltstyp erfassen", exact: true })
    .selectOption("VIDEO");
  await page
    .getByLabel("Titel", { exact: true })
    .fill("SYNTHETISCH Vimeo-Referenz");
  await page.getByLabel("HTTPS-Link").fill("https://vimeo.com/12345");
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(page.locator(".library-card")).toHaveCount(3);
  await page.reload();
  await nav.getByRole("button", { name: /Bibliothek/ }).click();
  await expect(page.locator(".library-card")).toHaveCount(3);
  await page.getByLabel("Suche", { exact: true }).fill("Vimeo");
  await expect(page.locator(".library-card")).toHaveCount(1);
  await page.getByLabel("Suche", { exact: true }).fill("");
  await page.getByLabel("Schlagwort", { exact: true }).fill("Architektur");
  await expect(page.locator(".library-card")).toHaveCount(1);
  await page.getByLabel("Schlagwort", { exact: true }).fill("");
  await page.addStyleTag({ content: "nextjs-portal{display:none}" });
  mkdirSync(".local/hub-screenshots", { recursive: true });
  await page.screenshot({
    path: ".local/hub-screenshots/library-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Markenprofil Studiojeker" }).click();
  await page
    .getByLabel("Claim", { exact: true })
    .fill("SYNTHETISCH Sichtbarkeit");
  await page.getByRole("button", { name: "Markenprofil speichern" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Markenprofil gespeichert",
  );
  await page.screenshot({
    path: ".local/hub-screenshots/library-brand-desktop.png",
    fullPage: true,
  });
  // Real authenticated API in isolated test schema: seed a two-post series for picker review.
  const result = await page.evaluate(async () => {
    const r = await fetch("/api/studio/series", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "SYNTHETISCH Bibliotheksserie",
        topic: "Testmotiv",
        offer: "",
        goal: "Interner Test",
        audience: "Testpersonen",
        tone: "Sachlich",
        channels: ["LINKEDIN"],
        count: 2,
        formats: ["1:1"],
        campaignId: null,
        referenceAssetIds: [],
      }),
    });
    return { ok: r.ok, body: await r.json() };
  });
  expect(result.ok).toBe(true);
  await nav.getByRole("button", { name: /Content-Studio/ }).click();
  await page
    .getByRole("button", { name: "Beiträge bearbeiten", exact: true })
    .click();
  await page
    .getByRole("button", { name: /01 · SYNTHETISCH Bibliotheksserie/ })
    .click();
  await page
    .getByRole("button", { name: "Aus Bibliothek wählen · Motiv" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Aus Bibliothek wählen" });
  await expect(dialog.locator(".library-card")).toHaveCount(1);
  await page.screenshot({
    path: ".local/hub-screenshots/library-picker-desktop.png",
    fullPage: true,
  });
  await dialog.locator(".library-card").click();
  await page
    .getByRole("button", { name: "Version speichern", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Neue Version gespeichert",
  );
  await page
    .getByRole("button", { name: /02 · SYNTHETISCH Bibliotheksserie/ })
    .click();
  await page
    .getByRole("button", { name: "Aus Bibliothek wählen · Motiv" })
    .click();
  await dialog.locator(".library-card").click();
  await page
    .getByRole("button", { name: "Version speichern", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Neue Version gespeichert",
  );
  await page.setViewportSize({ width: 1180, height: 820 });
  await nav.getByRole("button", { name: /Bibliothek/ }).click();
  await expect(
    page.getByRole("heading", { name: "Bibliothek", exact: true, level: 2 }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".local/hub-screenshots/library-ipad-landscape.png",
    fullPage: true,
  });
  // Clearly labelled UI adapter for missing-storage messaging; no simulated AI outputs.
  await page.route("**/api/library/state", async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    data.config.storage = "DISCONNECTED";
    await route.fulfill({ response, json: data });
  });
  await page.reload();
  await nav.getByRole("button", { name: /Bibliothek/ }).click();
  await expect(
    page.getByText(/Privater Speicher nicht verbunden/),
  ).toBeVisible();
  await expect(page.getByLabel("Dateien hochladen")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Text erfassen" }),
  ).toBeEnabled();
});
