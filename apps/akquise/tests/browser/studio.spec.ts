import { test, expect } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import sharp from "sharp";
test("StudioONE Desktop: eigener Beitrag, Wiederladen, Freigabe, Export und Entwertung", async ({
  page,
}) => {
  test.setTimeout(90000);
  const fixture =
    process.env.E2E_EMAIL && process.env.E2E_PASSWORD
      ? [process.env.E2E_EMAIL, process.env.E2E_PASSWORD]
      : (() => {
          const match = readFileSync(".local/demo-access.txt", "utf8").match(
            /Lokales synthetisches Konto: (\S+)\s+Einmaliges Passwort: (\S+)/,
          );
          if (!match) throw new Error("Synthetisches Testkonto fehlt.");
          return [match[1], match[2]];
        })();
  if (!fixture[0].endsWith("@example.test"))
    throw new Error("Nur synthetische Konten verwenden.");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.getByLabel("E-Mail", { exact: true }).fill(fixture[0]);
  await page.getByLabel("Passwort", { exact: true }).fill(fixture[1]);
  await page.getByRole("button", { name: /Sicher anmelden/ }).click();
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Content-Studio/ })
    .click();
  await expect(
    page.getByRole("button", { name: "Neues Briefing" }),
  ).toBeVisible();
  await expect(
    page.getByText("Nicht verbunden", { exact: true }).first(),
  ).toBeVisible();
  mkdirSync(".local/hub-screenshots", { recursive: true });
  await page
    .getByText("Eigene Bilder und freigegebene Schriftdateien", { exact: true })
    .click();
  await page
    .getByRole("checkbox", {
      name: "Ich darf diese Dateien für Studiojeker verwenden.",
    })
    .check();
  const image = await sharp({
    create: { width: 1200, height: 900, channels: 3, background: "#124655" },
  })
    .composite([
      {
        input: Buffer.from(
          '<svg width="1200" height="900"><circle cx="800" cy="330" r="230" fill="#00c8ff"/><rect x="100" y="570" width="1000" height="150" fill="#ffffff"/></svg>',
        ),
      },
    ])
    .png()
    .toBuffer();
  await page.getByLabel("Datei hochladen").setInputFiles({
    name: "SYNTHETISCH-Testmotiv.png",
    mimeType: "image/png",
    buffer: image,
  });
  await expect(page.getByRole("status")).toContainText("privat gespeichert");
  await page.getByRole("button", { name: "Neues Briefing" }).click();
  await page
    .getByLabel("Serientitel", { exact: true })
    .fill("Synthetische Desktop-Abnahme");
  await page
    .getByLabel("Thema", { exact: true })
    .fill("TESTINHALT: Einblick in die Bildgestaltung");
  await page
    .getByLabel("Kommunikationsziel", { exact: true })
    .fill("Synthetischer Ablauf zur internen Abnahme");
  await page
    .getByLabel("Zielgruppe", { exact: true })
    .fill("Interne Testpersonen");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: ".local/hub-screenshots/studio-01-briefing-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", {
      name: "Briefing und Entwürfe speichern · kostenlos",
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Synthetische Desktop-Abnahme · 1",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Headline", exact: true })
    .fill("TESTINHALT – Sichtbarkeit planen");
  await page
    .getByLabel("Bildidee", { exact: true })
    .fill("Synthetische geometrische Formen, keine reale Referenz");
  await page
    .getByLabel("Eigenes oder generiertes Motiv")
    .selectOption({ label: "SYNTHETISCH-Testmotiv.png" });
  await page
    .getByRole("button", { name: "Version speichern", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Neue Version gespeichert",
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: ".local/hub-screenshots/studio-02-editor-desktop.png",
    fullPage: true,
  });
  await page.reload();
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Content-Studio/ })
    .click();
  await page
    .getByRole("button", { name: /01 · Synthetische Desktop-Abnahme/ })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Headline", exact: true }),
  ).toHaveValue("TESTINHALT – Sichtbarkeit planen");
  await expect(
    page.getByRole("button", { name: "Ideen & Kanaltexte erstellen" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Layoutvorschau rendern" }).click();
  await expect(
    page.getByAltText("Gerenderte Layoutvorschau der gespeicherten Version"),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: ".local/hub-screenshots/studio-03-layout-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("checkbox", { name: /Ich habe diese gespeicherte Version/ })
    .check();
  await page
    .getByRole("button", { name: "Version freigeben", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Freigegebenes Sujet exportieren" }),
  ).toBeEnabled();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: ".local/hub-screenshots/studio-04-freigabe-desktop.png",
    fullPage: true,
  });
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Freigegebenes Sujet exportieren" })
    .click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.png$/);
  await page
    .getByRole("textbox", { name: "Headline", exact: true })
    .fill("TESTINHALT – überarbeitete Version");
  await expect(
    page.getByRole("button", { name: "Version freigeben", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Version speichern", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Freigegebenes Sujet exportieren" }),
  ).toBeDisabled();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: ".local/hub-screenshots/studio-05-entwertung-desktop.png",
    fullPage: true,
  });
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(
      page.getByRole("textbox", { name: "Headline", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `.local/hub-screenshots/studio-${width}.png`,
      fullPage: true,
    });
  }
});
