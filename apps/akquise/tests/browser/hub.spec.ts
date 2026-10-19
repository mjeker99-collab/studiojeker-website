import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync, mkdirSync } from "node:fs";
const access =
  process.env.E2E_EMAIL && process.env.E2E_PASSWORD
    ? `Lokales synthetisches Konto: ${process.env.E2E_EMAIL}\nEinmaliges Passwort: ${process.env.E2E_PASSWORD}`
    : readFileSync(".local/demo-access.txt", "utf8");
const credential = access.match(
  /Lokales synthetisches Konto: (\S+)\s+Einmaliges Passwort: (\S+)/,
)!;
async function signIn(page: Page) {
  await page.goto("/");
  await page.getByLabel("E-Mail", { exact: true }).fill(credential[1]);
  await page.getByLabel("Passwort", { exact: true }).fill(credential[2]);
  await page.getByRole("button", { name: /Sicher anmelden/ }).click();
  await expect(
    page.getByRole("heading", { name: "Übersicht", exact: true }),
  ).toBeVisible();
}
async function go(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: new RegExp(name) })
    .click();
}
async function api(page: Page, path: string, data: unknown) {
  const r = await page.request.post("/api/hub/" + path, {
    headers: { Origin: "http://localhost:3100" },
    data,
  });
  expect(r.ok(), await r.text()).toBe(true);
  return r.json();
}
let campaignId: string, socialId: string, newsletterId: string;
test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await signIn(page);
  const state = await (await page.request.get("/api/state")).json();
  const ownerId = state.user.id;
  const at = new Date();
  at.setUTCDate(15);
  at.setUTCHours(9, 0, 0, 0);
  const c = await api(page, "campaigns", {
    title: "Synthetische Herbstkampagne",
    goal: "Architektur und Projekte visuell erklären",
    audience: "Synthetische B2B-Zielgruppe",
    startsAt: new Date(at.valueOf() - 7 * 86400000).toISOString(),
    endsAt: new Date(at.valueOf() + 14 * 86400000).toISOString(),
    ownerId,
  });
  campaignId = c.id;
  const base = {
    title: "Synthetischer Projektblick",
    ownerId,
    campaignId,
    scheduledAt: null,
    subject: "",
    preheader: "",
    body: "",
    audience: "",
    variants: [
      {
        channel: "LINKEDIN",
        text: "Wie wird aus einer Projektidee ein klares Bild? Dieser synthetische Entwurf zeigt unseren geplanten Blick auf Architekturvisualisierungen.",
        cta: "Lassen Sie uns über Ihre visuelle Kommunikation sprechen.",
        link: "https://example.test/projekt",
        mediaType: "IMAGE",
        mediaUrl: "",
        mediaReference: "Synthetisches Bild · Asset SJ-001",
        scheduledAt: at.toISOString(),
      },
      {
        channel: "INSTAGRAM",
        text: "Perspektiven sichtbar machen. Ein synthetischer Einblick in unsere Content-Planung. #Studiojeker",
        cta: "Mehr Einblicke im Profil",
        link: "",
        mediaType: "VIDEO",
        mediaUrl: "",
        mediaReference: "Synthetischer Film · Asset SJ-002",
        scheduledAt: new Date(at.valueOf() + 86400000).toISOString(),
      },
    ],
  };
  const s = await api(page, "contents", { ...base, kind: "SOCIAL" });
  socialId = s.id;
  const n = await api(page, "contents", {
    ...base,
    kind: "NEWSLETTER",
    title: "Synthetischer Studiojeker Monatsblick",
    subject: "Neue Perspektiven für Ihre Kommunikation",
    preheader: "Geplante Themen aus dem Studio",
    body: "Guten Tag\n\nDieser synthetische Newsletter zeigt unsere redaktionelle Planung.\n\nWir verbinden Architekturvisualisierung, Fotografie und Film zu klarer Projektkommunikation.\n\nFreundliche Grüsse\nNora Jeker",
    audience: "Synthetisches Mailchimp-Segment – Einwilligungen separat prüfen",
    variants: [],
    scheduledAt: new Date(at.valueOf() + 2 * 86400000).toISOString(),
  });
  newsletterId = n.id;
  await api(page, "review/" + socialId, {
    version: 1,
    decision: "PENDING",
    read: false,
  });
  await api(page, "review/" + newsletterId, {
    version: 1,
    decision: "APPROVED",
    read: true,
  });
  await page.close();
});
test("Hub API schützt Authentifizierung und Origin; keine Integrationen verbunden", async ({
  request,
}) => {
  expect((await request.get("/api/hub/state")).status()).toBe(401);
  expect(
    (
      await request.post("/api/hub/campaigns", {
        headers: { Origin: "https://example.test" },
        data: {},
      })
    ).status(),
  ).toBe(403);
});
test("Social: Kanalvarianten speichern, wiederladen und nach Änderung erneut freigeben", async ({
  page,
}) => {
  await signIn(page);
  await go(page, "Social Media");
  await page
    .locator(`[data-content-id="${socialId}"]`)
    .getByRole("button", { name: /Inhalt öffnen/ })
    .click();
  await expect(
    page.getByRole("textbox", { name: "LinkedIn Text", exact: true }),
  ).toHaveValue(/synthetische/);
  await expect(
    page.getByRole("textbox", { name: "Instagram Text", exact: true }),
  ).toHaveValue(/synthetischer/);
  await expect(
    page.getByRole("button", { name: "Version freigeben", exact: true }),
  ).toBeDisabled();
  await page.getByLabel(/Ich habe die vollständige Version/).check();
  await page
    .getByRole("button", { name: "Version freigeben", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Gespeichert.");
  await page
    .locator(`[data-content-id="${socialId}"]`)
    .getByRole("button", { name: /Inhalt öffnen/ })
    .click();
  await page
    .getByRole("textbox", { name: "LinkedIn Text", exact: true })
    .fill("Geänderter synthetischer Beitrag für Version 2.");
  await expect(
    page.getByRole("button", { name: "Version freigeben", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Version speichern", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Inhalt bearbeiten · V2/ }),
  ).toBeVisible();
  await page.reload();
  await go(page, "Social Media");
  await page
    .locator(`[data-content-id="${socialId}"]`)
    .getByRole("button", { name: /Inhalt öffnen/ })
    .click();
  await expect(
    page.getByRole("textbox", { name: "LinkedIn Text", exact: true }),
  ).toHaveValue("Geänderter synthetischer Beitrag für Version 2.");
  await expect(page.getByLabel("Zugeordnete Kampagne")).toHaveValue(campaignId);
  mkdirSync(".local/hub-screenshots", { recursive: true });
  await page.screenshot({
    path: ".local/hub-screenshots/hub-desktop-social-editor.png",
    fullPage: true,
  });
  const data = await (await page.request.get("/api/hub/state")).json();
  const content = data.contents.find((c: { id: string }) => c.id === socialId);
  expect(content.status).toBe("DRAFT");
  expect(
    content.approvals.every(
      (a: { status: string }) => a.status === "INVALIDATED",
    ),
  ).toBe(true);
});
test("Newsletter: Freigegebene Version exportieren, ohne Übertragung oder Versand", async ({
  page,
}) => {
  await signIn(page);
  await go(page, "Newsletter");
  await page
    .locator(`[data-content-id="${newsletterId}"]`)
    .getByRole("button", { name: /Inhalt öffnen/ })
    .click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "HTML & Text exportieren" }).click();
  expect((await download).suggestedFilename()).toMatch(
    /newsletter-.*\.(html|txt)$/,
  );
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Nichts an Mailchimp übertragen" }),
  ).toContainText("Nichts an Mailchimp übertragen");
  const state = await (await page.request.get("/api/hub/state")).json();
  expect(state.integrations.mailchimp).toBe("NOT_CONNECTED");
  expect(
    state.contents.find((c: { id: string }) => c.id === newsletterId).exports
      .length,
  ).toBeGreaterThan(0);
});
test("Kampagne lässt sich über das Formular erstellen und wieder laden", async ({
  page,
}) => {
  await signIn(page);
  await go(page, "Kampagnen");
  await page.getByRole("button", { name: /Kampagne erstellen/ }).click();
  await page
    .getByRole("textbox", { name: "Kampagnentitel", exact: true })
    .fill("Synthetische Review-Kampagne");
  await page
    .getByRole("textbox", { name: "Ziel", exact: true })
    .fill("Gemeinsame Planung für die V1-Abnahme");
  await page
    .getByRole("textbox", { name: "Zielgruppe", exact: true })
    .fill("Synthetische Kontakte");
  await page
    .getByLabel("Beginn (Zürich)", { exact: true })
    .fill("2027-01-05T09:00");
  await page
    .getByLabel("Ende (Zürich)", { exact: true })
    .fill("2027-01-29T17:00");
  await page
    .getByRole("button", { name: "Kampagne speichern", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Gespeichert.");
  await page.reload();
  await go(page, "Kampagnen");
  await expect(
    page.getByRole("heading", {
      name: "Synthetische Review-Kampagne",
      exact: true,
    }),
  ).toBeVisible();
});
for (const [label, width, height] of [
  ["desktop", 1440, 1000],
  ["ipad", 1024, 768],
  ["ipad-portrait", 768, 1024],
] as const) {
  test(`${label}: neue Ansichten, Filter und Kalender sind zugänglich und ohne Überlauf`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await signIn(page);
    mkdirSync(".local/hub-screenshots", { recursive: true });
    for (const section of [
      "Kampagnen",
      "Social Media",
      "Newsletter",
      "Kalender",
    ]) {
      await go(page, section);
      await expect(
        page.getByRole("heading", { name: section, exact: true }),
      ).toBeVisible();
      await expect(page.locator(".hub-connection")).toBeVisible();
      if (section === "Kalender")
        await expect(page.locator(".hub-calendar")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const a11y = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(a11y.violations).toEqual([]);
      if (label !== "ipad-portrait")
        await page.screenshot({
          path: `.local/hub-screenshots/hub-${label}-${section.replace(/ /g, "-").toLowerCase()}.png`,
          fullPage: true,
        });
    }
    await page
      .getByRole("button", { name: "Listenansicht", exact: true })
      .click();
    await expect(page.locator(".hub-agenda")).toContainText(
      "Nicht übertragen / nicht versandt",
    );
    await page
      .getByRole("combobox", { name: "Kanal", exact: true })
      .selectOption("NEWSLETTER");
    await expect(page.locator(".hub-agenda")).not.toContainText("LinkedIn");
    await page
      .getByRole("combobox", { name: "Kampagne", exact: true })
      .selectOption(campaignId);
    await expect(page.locator(".hub-agenda")).toContainText(
      "Synthetischer Studiojeker Monatsblick",
    );
  });
}
