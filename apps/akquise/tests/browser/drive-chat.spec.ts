import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Synthetic browser responses only: no Google account, AI request or storage needed.
test("Drive picker browses, paginates, previews and confirms images on iPad and phone without S3", async ({
  page,
}) => {
  const user = { id: "synthetic", name: "Synthetischer Test" };
  const state = {
    series: [{ id: "chat", title: "Testgespräch", contents: [] }],
    assets: [],
    jobs: [],
    campaigns: [],
    customers: [],
    users: [user],
    brand: {},
    config: {
      connected: true,
      storage: "DISCONNECTED",
      textReserve: 0.1,
      imageReserve: 0.25,
      textModel: "synthetic",
      imageModel: "synthetic",
      dailyRequests: 20,
      dailyBudget: 5,
      missingStorage: [],
      costNote: "Synthetischer Test",
    },
  };
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFUlEQVQYlWNg+P+fMGIYVcQw+IIAAEcUHvBhYS22AAAAAElFTkSuQmCC",
    "base64",
  );
  let submitted: Record<string, unknown> | undefined;
  let ran = false;
  const previews: string[] = [];
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
          connection: { folderId: "root", folderName: "Relaunch 2026" },
        },
      });
    if (path === "/api/drive/files") {
      if (!url.searchParams.get("folderId"))
        return route.fulfill({
          json: {
            files: [
              {
                id: "bilder",
                name: "Bilder",
                mimeType: "application/vnd.google-apps.folder",
              },
            ],
            nextPageToken: null,
          },
        });
      const page2 = url.searchParams.get("pageToken");
      return route.fulfill({
        json: {
          files: page2
            ? [
                {
                  id: "photo5",
                  name: "Weiteres Bild.png",
                  mimeType: "image/png",
                  size: "128",
                },
              ]
            : [
                ...[1, 2, 3, 4].map((i) => ({
                  id: `photo${i}`,
                  name: `Nora ${i}.png`,
                  mimeType: "image/png",
                  size: "128",
                })),
                {
                  id: "pdf",
                  name: "Dokument.pdf",
                  mimeType: "application/pdf",
                  size: "128",
                },
                {
                  id: "large",
                  name: "Grosses Bild.png",
                  mimeType: "image/png",
                  size: "9999999",
                },
              ],
          nextPageToken: page2 ? null : "page2",
        },
      });
    }
    if (path.startsWith("/api/drive/preview/")) {
      previews.push(path);
      return route.fulfill({ body: png, contentType: "image/png" });
    }
    if (path === "/api/studio/jobs") {
      submitted = route.request().postDataJSON();
      return route.fulfill({ json: { id: "job" } });
    }
    if (path === "/api/studio/run/job") {
      ran = true;
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({
      status: 404,
      json: { error: "Unexpected synthetic route" },
    });
  });
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Content-Studio/ })
    .click();
  const chat = page.locator(".studio-chat");
  await chat
    .getByText("Projekte öffnen oder neues Gespräch beginnen", { exact: true })
    .click();
  await chat.getByLabel("Gespräch / Content-Serie").selectOption("chat");
  await chat
    .getByText("Bild hinzufügen oder auswählen", { exact: true })
    .click();
  await chat
    .getByRole("button", { name: "Bilder aus Google Drive wählen" })
    .click();
  await chat.getByRole("button", { name: "Ordner öffnen: Bilder" }).click();
  await expect(
    chat.getByRole("checkbox", { name: /Dokument.pdf/ }),
  ).toBeDisabled();
  await expect(
    chat.getByRole("checkbox", { name: /Grosses Bild.png/ }),
  ).toBeDisabled();
  expect(previews).toHaveLength(0);
  const consent = chat.getByRole("checkbox", {
    name: /Ich bestätige die Nutzungsrechte/,
  });
  await chat
    .getByLabel("Deine Nachricht", { exact: true })
    .fill("Erstelle einen Social Post mit Nora.");
  await consent.check();
  await chat.getByRole("checkbox", { name: "Nora 1.png", exact: true }).check();
  await expect(consent).not.toBeChecked();
  await expect(chat.getByAltText("Vorschau: Nora 1.png")).toBeVisible();
  for (const i of [2, 3, 4])
    await chat
      .getByRole("checkbox", { name: `Nora ${i}.png`, exact: true })
      .check();
  await chat.getByRole("button", { name: "Weitere Dateien" }).click();
  await expect(
    chat.getByRole("checkbox", { name: "Weiteres Bild.png", exact: true }),
  ).toBeDisabled();
  await chat
    .getByRole("button", {
      name: "Drive-Bild entfernen: Nora 4.png",
      exact: true,
    })
    .click();
  await chat
    .getByRole("checkbox", { name: "Weiteres Bild.png", exact: true })
    .check();
  await chat.getByRole("button", { name: "Übergeordneter Ordner" }).click();
  await expect(
    chat.getByRole("button", { name: "Ordner öffnen: Bilder" }),
  ).toBeVisible();
  await expect(
    chat.getByText("Bildreferenzen: 4/4", { exact: true }),
  ).toBeVisible();
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const scan = await new AxeBuilder({ page })
      .include(".studio-chat")
      .analyze();
    expect(scan.violations).toEqual([]);
  }
  await chat
    .getByLabel("Deine Nachricht", { exact: true })
    .fill("Erstelle einen Social Post mit Nora.");
  await expect(
    chat.getByRole("button", { name: "An GPT senden", exact: true }),
  ).toBeDisabled();
  await consent.check();
  await chat
    .getByRole("button", { name: "An GPT senden", exact: true })
    .click();
  await expect.poll(() => ran).toBe(true);
  expect(submitted?.driveReferenceIds).toEqual([
    "photo1",
    "photo2",
    "photo3",
    "photo5",
  ]);
  expect(submitted?.referenceIds).toEqual([]);
  expect(submitted?.referenceTransfer).toBe(true);
  await chat.getByLabel("Gespräch / Content-Serie").selectOption("");
  await expect(
    chat.getByText("Bildreferenzen: 0/4", { exact: true }),
  ).not.toBeVisible();
});
