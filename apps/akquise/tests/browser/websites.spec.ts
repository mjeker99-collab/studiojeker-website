import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
import {
  blankWebsite,
  blankPage,
  blankSection,
  type WebsiteDocument,
} from "../../lib/websites/input";
test("Create, edit, GPT proposal preview/adoption, restore, reopen, responsive and accessible", async ({
  page,
}) => {
  test.setTimeout(120000);
  const documents: WebsiteDocument[] = [];
  let jobs: unknown[] = [];
  let aiCalls = 0;
  let failSave = false;
  let publication: {
    slug: string;
    version: number;
    revision: number;
    active: boolean;
  } | null = null;
  const proposal = {
    ...structuredClone(blankWebsite),
    name: "Testbetrieb",
    pages: [
      {
        ...blankPage,
        headline: "Sichtbar mit Testbetrieb",
        intro: "Ein präziser Einstieg.",
        sections: [
          {
            ...blankSection,
            heading: "Unser Angebot",
            body: "Beschreibung des Angebots",
            ctaLabel: "Kontakt aufnehmen",
            ctaUrl: "kontakt.html",
          },
        ],
      },
      { ...blankPage, slug: "kontakt", title: "Kontakt", headline: "Kontakt" },
    ],
  };
  const project = () => ({
    id: "web1",
    name: documents.at(-1)?.name,
    customerId: null,
    version: documents.length,
    document: documents.at(-1),
    versions: documents.map((_, i) => ({ version: i + 1 })).reverse(),
    jobs,
    publication,
  });
  await page.route("**/api/**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    if (path === "/api/state")
      return route.fulfill({
        json: {
          user: { id: "test", name: "Martin Jeker" },
          users: [],
          contacts: [],
          drafts: [],
          deliveries: [],
          suppressions: [],
          audits: [],
          generator: "disabled",
          externalSending: false,
          mailMode: "disabled",
        },
      });
    if (path === "/api/websites" && request.method() === "GET")
      return route.fulfill({
        json: {
          projects: documents.length ? [project()] : [],
          customers: [],
          images: [
            { id: "test-image", name: "Eigenes Bild.png", mime: "image/png" },
          ],
          config: { connected: true, model: "synthetic", reserveUsd: 0.3 },
        },
      });
    if (path === "/api/websites/web1" && request.method() === "GET")
      return route.fulfill({ json: project() });
    if (path === "/api/studio/assets/test-image")
      return route.fulfill({
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
          "base64",
        ),
      });
    if (path.endsWith("/publish")) {
      const input = request.postDataJSON();
      expect(input.confirmedPublic).toBe(true);
      expect(input.version).toBe(documents.length);
      publication = {
        slug: input.slug,
        version: input.version,
        revision: (publication?.revision || 0) + 1,
        active: true,
      };
      return route.fulfill({ json: { ok: true } });
    }
    if (path.endsWith("/unpublish")) {
      publication = {
        ...publication!,
        active: false,
        revision: publication!.revision + 1,
      };
      return route.fulfill({ json: { ok: true } });
    }
    if (
      ["/api/websites", "/api/websites/web1"].includes(path) &&
      request.method() === "POST"
    ) {
      if (failSave)
        return route.fulfill({
          status: 409,
          json: { error: "Website wurde inzwischen geändert." },
        });
      documents.push(request.postDataJSON().document);
      return route.fulfill({ json: { id: "web1", version: documents.length } });
    }
    if (path.endsWith("/assist")) {
      const body = request.postDataJSON();
      expect(body.confirmedCosts).toBe(true);
      expect(body.confirmedTransfer).toBe(true);
      aiCalls++;
      jobs = [
        {
          id: "job1",
          status: "SUCCEEDED",
          version: documents.length,
          message: body.message,
          result: {
            reply: "Startseite und Kontakt ergänzt.",
            document: proposal,
          },
        },
      ];
      return route.fulfill({
        json: {
          jobId: "job1",
          reply: "Startseite und Kontakt ergänzt.",
          document: proposal,
        },
      });
    }
    if (path.endsWith("/apply")) {
      expect(request.postDataJSON().version).toBe(documents.length);
      documents.push(structuredClone(proposal));
      return route.fulfill({ json: { id: "web1", version: documents.length } });
    }
    if (path.endsWith("/restore")) {
      documents.push(
        structuredClone(documents[request.postDataJSON().restoreVersion - 1]),
      );
      return route.fulfill({ json: { id: "web1", version: documents.length } });
    }
    return route.fulfill({
      json: {
        campaigns: [],
        contents: [],
        users: [],
        drafts: [],
        customers: [],
        integrations: {},
      },
    });
  });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Website/ })
    .click();
  const studio = page.getByRole("region", {
    name: "Website-Studio",
    exact: true,
  });
  const gpt = studio.getByRole("button", { name: "✦ GPT beauftragen" });
  await expect(gpt).toBeDisabled();
  await studio.getByLabel("Projektname", { exact: true }).fill("Testbetrieb");
  await studio
    .getByLabel("Briefing", { exact: true })
    .fill("Eine Website für unseren Testbetrieb, mit Startseite und Kontakt.");
  await studio
    .getByRole("button", { name: "Projekt anlegen", exact: true })
    .click();
  await expect(
    studio.getByText("Version 1 gespeichert", { exact: true }),
  ).toBeVisible();
  await studio
    .getByLabel("Dein Auftrag an GPT")
    .fill("Erstelle die beiden Seiten");
  await expect(gpt).toBeDisabled();
  await studio.getByRole("checkbox", { name: /Website, Kundenwissen/ }).check();
  await gpt.click();
  await expect(
    studio.getByText("Startseite und Kontakt ergänzt.", { exact: false }),
  ).toBeVisible();
  expect(aiCalls).toBe(1);
  await expect(
    studio.getByLabel("Hauptüberschrift", { exact: true }),
  ).toHaveValue("Deine Überschrift");
  await studio.getByRole("button", { name: "Vorschau des Vorschlags" }).click();
  await expect(
    studio.frameLocator("iframe").getByRole("heading", { level: 1 }),
  ).toHaveText("Sichtbar mit Testbetrieb");
  await expect(
    studio.getByLabel("Hauptüberschrift", { exact: true }),
  ).toHaveValue("Deine Überschrift");
  await studio.getByRole("button", { name: "Vorschlag übernehmen" }).click();
  await expect(
    studio.getByLabel("Hauptüberschrift", { exact: true }),
  ).toHaveValue("Sichtbar mit Testbetrieb");
  await expect(
    studio.getByRole("button", { name: "Vorschlag übernehmen" }),
  ).toBeDisabled();
  await studio
    .getByLabel("Hauptüberschrift", { exact: true })
    .fill("Von Hand bearbeitet");
  await expect(gpt).toBeDisabled();
  failSave = true;
  await studio
    .getByRole("button", { name: "Änderungen speichern", exact: true })
    .click();
  await expect(studio.getByRole("alert")).toContainText("inzwischen geändert");
  await expect(
    studio.getByLabel("Hauptüberschrift", { exact: true }),
  ).toHaveValue("Von Hand bearbeitet");
  failSave = false;
  await studio
    .getByRole("button", { name: "Änderungen speichern", exact: true })
    .click();
  await expect(
    studio.getByText("Version 3 gespeichert", { exact: true }),
  ).toBeVisible();
  await studio
    .getByRole("button", { name: "Neue Website", exact: true })
    .click();
  await studio
    .getByLabel("Gespeicherte Website", { exact: true })
    .selectOption("web1");
  await expect(
    studio.getByLabel("Hauptüberschrift", { exact: true }),
  ).toHaveValue("Von Hand bearbeitet");
  const publishing = studio.getByRole("region", {
    name: "Veröffentlichung",
    exact: true,
  });
  await studio.getByText("SEO & Gestaltung", { exact: true }).click();
  await studio
    .getByLabel("Gestaltungsvorlage", { exact: true })
    .selectOption("CAMPAIGN");
  await expect(
    publishing.getByRole("button", { name: "Jetzt veröffentlichen" }),
  ).toBeDisabled();
  await studio
    .getByLabel("Gestaltungsvorlage", { exact: true })
    .selectOption("EDITORIAL");
  await studio
    .getByLabel("Bild aus der Mediathek", { exact: true })
    .selectOption("test-image");
  await studio
    .getByLabel("Bildbeschreibung", { exact: true })
    .fill("Eigenes Testbild");
  await expect(
    studio
      .frameLocator("iframe")
      .getByRole("img", { name: "Eigenes Testbild" }),
  ).toHaveAttribute("src", /^data:image\/png;base64,/);
  await studio
    .getByLabel("Bild aus der Mediathek", { exact: true })
    .selectOption("");
  await studio.getByLabel("Bildbeschreibung", { exact: true }).fill("");
  await publishing
    .getByLabel("Webadresse", { exact: true })
    .fill("testbetrieb");
  await expect(
    publishing.getByRole("button", { name: "Jetzt veröffentlichen" }),
  ).toBeDisabled();
  await publishing.getByRole("checkbox").check();
  await publishing
    .getByRole("button", { name: "Jetzt veröffentlichen" })
    .click();
  await expect(
    publishing.getByRole("link", { name: /Veröffentlichte Website/ }),
  ).toHaveAttribute("href", "/sites/testbetrieb/index.html");
  await publishing
    .getByRole("button", { name: "Veröffentlichung zurückziehen" })
    .click();
  await expect(
    publishing.getByRole("link", { name: /Veröffentlichte Website/ }),
  ).toHaveCount(0);
  for (const width of [1440, 1180, 820, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .include(".website-builder")
          .setLegacyMode()
          .options({ iframes: false })
          .analyze()
      ).violations,
    ).toEqual([]);
    const frame = studio.frameLocator("iframe");
    await expect(frame.getByRole("heading", { level: 1 })).toHaveText(
      "Von Hand bearbeitet",
    );
    await studio.locator("iframe").scrollIntoViewIfNeeded();
    await expect(frame.getByRole("heading", { level: 1 })).toBeVisible();
    mkdirSync(".local/website-screenshots", { recursive: true });
    await studio
      .locator("iframe")
      .screenshot({ path: `.local/website-screenshots/preview-${width}.png` });
    await page.screenshot({
      path: `.local/website-screenshots/website-${width}.png`,
      fullPage: true,
    });
  }
  await studio
    .getByLabel("Früheren Stand wählen", { exact: true })
    .selectOption("1");
  await studio
    .getByRole("button", { name: "Version wiederherstellen" })
    .click();
  await expect(
    studio.getByLabel("Hauptüberschrift", { exact: true }),
  ).toHaveValue("Deine Überschrift");
  await expect(
    studio.getByRole("link", { name: /Website als HTML-Paket/ }),
  ).toHaveAttribute("href", "/api/websites/web1/export?version=4");
  expect(aiCalls).toBe(1);
});

// The editor iframe intentionally disallows script injection. Audit its exported document separately.
test("Exported website remains accessible at desktop and mobile widths", async ({
  page,
}) => {
  const { websiteHtml } = await import("../../lib/websites/render");
  const doc = {
    ...structuredClone(blankWebsite),
    footer: "Testbetrieb",
    pages: [
      {
        ...blankPage,
        headline: "Testbetrieb",
        sections: [{ ...blankSection, body: "Unser Angebot" }],
      },
    ],
  };
  await page.setContent(websiteHtml(doc));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (await new AxeBuilder({ page }).setLegacyMode().analyze()).violations,
    ).toEqual([]);
  }
});
