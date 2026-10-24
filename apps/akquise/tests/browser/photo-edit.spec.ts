import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";

test("Direct photo edit: device, library, Drive, comparison and explicit adoption", async ({
  page,
}) => {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFUlEQVQYlWNg+P+fMGIYVcQw+IIAAEcUHvBhYS22AAAAAElFTkSuQmCC",
    "base64",
  );
  const user = { id: "synthetic", name: "Testperson" };
  const asset = (id: string) => ({
    id,
    name: `${id}.png`,
    mime: "image/png",
    kind: "ORIGINAL",
    sha256: "a".repeat(64),
    size: png.length,
    width: 12,
    height: 12,
  });
  const state = {
    series: [{ id: "photos", title: "Fototest", contents: [] }],
    assets: [asset("bibliothek")],
    jobs: [
      {
        id: "proposal-job",
        seriesId: "photos",
        kind: "CHAT",
        status: "SUCCEEDED",
        model: "synthetic",
        reserveUsd: 0.1,
        createdAt: new Date().toISOString(),
        input: {
          request: {
            message: "Wie kann ich das Foto verbessern?",
            referenceIds: ["bibliothek"],
          },
        },
        result: {
          reply: "Schatten aufhellen und eine dezente Vignette ergänzen.",
        },
      },
    ] as Record<string, unknown>[],
    campaigns: [],
    customers: [],
    users: [user],
    brand: {},
    config: {
      connected: true,
      storage: "S3",
      textReserve: 0.1,
      imageReserve: 0.25,
      dailyRequests: 20,
      dailyBudget: 5,
    },
  };
  let submitted: Record<string, unknown> = {};
  let runs = 0;
  let applied = 0;
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path === "/api/project-drafts") return route.fulfill({ json: [] });
    if (path === "/api/state")
      return route.fulfill({
        json: {
          user,
          users: [user],
          contacts: [],
          drafts: [],
          deliveries: [],
          suppressions: [],
          audits: [],
          generator: "synthetic",
          externalSending: false,
          mailMode: "disabled",
        },
      });
    if (path === "/api/hub/state")
      return route.fulfill({
        json: { users: [user], campaigns: [], contents: [], drafts: [] },
      });
    if (path === "/api/studio/state") return route.fulfill({ json: state });
    if (path === "/api/drive/status")
      return route.fulfill({
        json: {
          configured: true,
          connection: { folderId: "root", folderName: "Test" },
        },
      });
    if (path === "/api/drive/files")
      return route.fulfill({
        json: {
          files: [
            {
              id: "drive-photo",
              name: "Drive-Foto.png",
              mimeType: "image/png",
              size: String(png.length),
            },
          ],
          nextPageToken: null,
        },
      });
    if (
      path.startsWith("/api/drive/preview/") ||
      path.startsWith("/api/studio/assets/")
    )
      return route.fulfill({ body: png, contentType: "image/png" });
    if (path === "/api/studio/upload") {
      expect(route.request().headers()["x-rights-confirmed"]).toBe("true");
      state.assets.push(asset("geraet"));
      return route.fulfill({ json: asset("geraet") });
    }
    if (path === "/api/studio/jobs") {
      submitted = route.request().postDataJSON();
      state.jobs = [
        {
          id: "edit-job",
          seriesId: "photos",
          kind: "IMAGE",
          status: "QUEUED",
          model: "synthetic",
          reserveUsd: 0.25,
          createdAt: new Date().toISOString(),
          input: { request: submitted },
        },
      ];
      return route.fulfill({ json: { id: "edit-job" } });
    }
    if (path === "/api/studio/run/edit-job") {
      runs++;
      state.assets.push(asset("ergebnis"));
      state.jobs[0] = {
        ...state.jobs[0],
        status: "SUCCEEDED",
        result: { assetId: "ergebnis", sourceAssetIds: ["bibliothek"] },
      };
      return route.fulfill({ json: { ok: true } });
    }
    if (path === "/api/studio/apply/edit-job") {
      applied++;
      state.jobs[0].status = "APPLIED";
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({
      status: 400,
      json: { error: `Unexpected test route ${path}` },
    });
  });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Content-Studio/ })
    .click();
  const chat = page.locator(".studio-chat");
  if (!(await chat.getByLabel("Gespräch / Content-Serie").isVisible()))
    await chat
      .getByText("Projekte öffnen oder neues Gespräch beginnen", {
        exact: true,
      })
      .click();
  await chat.getByLabel("Gespräch / Content-Serie").selectOption("photos");
  await chat
    .getByRole("button", { name: "Darauf antworten", exact: true })
    .click();
  await expect(chat.getByLabel("Auftrag", { exact: true })).toHaveValue("TEXT");
  await expect(
    chat.getByRole("group", { name: "Ausgewählter GPT-Vorschlag" }),
  ).toContainText("Schatten aufhellen");
  await expect(
    chat.getByLabel("Deine Nachricht", { exact: true }),
  ).toBeFocused();
  expect(runs).toBe(0);
  await chat
    .getByRole("button", { name: "Bezug entfernen", exact: true })
    .click();
  await chat
    .getByRole("checkbox", { name: /^bibliothek\.png(?:\s|$)/ })
    .uncheck();
  await chat.getByText("Weitere Auftragsoptionen", { exact: true }).click();
  await chat.getByLabel("Auftrag", { exact: true }).selectOption("EDIT");
  await chat
    .getByLabel("Deine Nachricht", { exact: true })
    .fill("Schatten aufhellen");
  const submit = chat.getByRole("button", {
    name: "Bild jetzt bearbeiten",
    exact: true,
  });
  await expect(submit).toBeDisabled();
  // A library image and a Drive image can each be selected without uploading.
  await chat
    .getByRole("checkbox", { name: "bibliothek.png", exact: true })
    .check();
  await expect(chat.getByAltText("Ausgewählt: bibliothek.png")).toBeVisible();
  await chat.getByRole("checkbox", { name: /bibliothek.png/ }).uncheck();
  await chat
    .getByRole("button", { name: "Bilder aus Google Drive wählen" })
    .click();
  await chat
    .getByRole("checkbox", { name: "Drive-Foto.png", exact: true })
    .check();
  await expect(
    chat.getByText("Bildreferenzen: 1/1", { exact: true }),
  ).toBeVisible();
  await chat
    .getByRole("checkbox", { name: "Drive-Foto.png", exact: true })
    .uncheck();
  await chat
    .getByRole("checkbox", { name: /Ich darf das hochgeladene Bild/ })
    .check();
  await chat
    .getByLabel("Bild hochladen (JPEG, PNG oder WebP, maximal 8 MB)")
    .setInputFiles({ name: "geraet.png", mimeType: "image/png", buffer: png });
  await expect(chat.getByAltText("Ausgewählt: geraet.png")).toBeVisible();
  await expect(submit).toBeDisabled();
  await chat
    .getByRole("button", { name: "Vorschlag am Bild ausführen", exact: true })
    .click();
  await expect(chat.getByAltText("Ausgewählt: bibliothek.png")).toBeVisible();
  await expect(chat.getByLabel("Deine Nachricht", { exact: true })).toHaveValue(
    "Bitte so ausführen.",
  );
  const execute = chat.getByRole("button", {
    name: "Vorschlag jetzt am Bild ausführen",
    exact: true,
  });
  await expect(execute).toBeDisabled();
  expect(runs).toBe(0);
  await chat
    .getByRole("checkbox", { name: /kostenpflichtige Bearbeitung/ })
    .check();
  await execute.click();
  await expect(chat.getByAltText("Ergebnis der Bildbearbeitung")).toBeVisible();
  expect(submitted.kind).toBe("IMAGE");
  expect(submitted.photoEdit).toBe(true);
  expect(submitted.message).toBe("Bitte so ausführen.");
  expect(submitted.replyToJobId).toBe("proposal-job");
  expect(submitted.referenceIds).toEqual(["bibliothek"]);
  expect(submitted.driveReferenceIds).toEqual([]);
  expect(runs).toBe(1);
  expect(applied).toBe(0);
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(
    (await new AxeBuilder({ page }).include(".studio-chat").analyze())
      .violations,
  ).toEqual([]);
  mkdirSync(".local/hub-screenshots", { recursive: true });
  await chat.screenshot({
    path: ".local/hub-screenshots/studio-photo-edit-mobile.png",
  });
  await chat
    .getByRole("button", { name: "Als neue Version übernehmen", exact: true })
    .click();
  await expect(
    chat.getByText("Als neue Entwurfsversion übernommen.", { exact: true }),
  ).toBeVisible();
  expect(applied).toBe(1);
  await page.reload();
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Content-Studio/ })
    .click();
  await chat
    .getByText("Projekte öffnen oder neues Gespräch beginnen", { exact: true })
    .click();
  await chat.getByLabel("Gespräch / Content-Serie").selectOption("photos");
  await expect(
    chat.getByAltText("Ausgangsbild vor der Bearbeitung"),
  ).toBeVisible();
  await chat
    .getByRole("button", { name: "Dieses Ergebnis weiter bearbeiten" })
    .click();
  await expect(chat.getByLabel("Auftrag", { exact: true })).toHaveValue("EDIT");
  await expect(chat.getByAltText("Ausgewählt: ergebnis.png")).toBeVisible();
  await expect(
    chat.getByRole("button", { name: "Bild jetzt bearbeiten", exact: true }),
  ).toBeDisabled();
});
