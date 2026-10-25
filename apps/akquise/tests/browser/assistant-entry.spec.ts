import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";

test("GPT entry points preserve input and require an explicit confirmed request", async ({
  page,
}) => {
  test.setTimeout(90000);
  const writes: string[] = [];
  let failStudio = true;
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== "GET") writes.push(path);
    if (path === "/api/project-drafts") return route.fulfill({ json: [] });
    if (path === "/api/state")
      return route.fulfill({
        json: {
          user: { id: "synthetic", name: "Testperson" },
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
    if (path === "/api/hub/state")
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
    if (path === "/api/studio/state")
      return route.fulfill(
        failStudio
          ? {
              status: 503,
              json: { error: "Synthetischer Verbindungsfehler" },
            }
          : {
              json: {
                series: [],
                jobs: [],
                assets: [],
                campaigns: [],
                customers: [],
                organization: { name: "Testfirma" },
                config: {
                  connected: true,
                  storage: "DISCONNECTED",
                  textReserve: 0.1,
                  imageReserve: 0.5,
                },
              },
            },
      );
    return route.fulfill({
      json: { connections: [], configured: { meta: false, linkedin: false } },
    });
  });
  page.on("dialog", async (dialog) => {
    expect(dialog.message()).toBe("Ungesicherte Projektänderungen verwerfen?");
    await dialog.accept();
  });
  await page.goto("/");
  for (const section of ["Kampagnen", "Social Media"]) {
    await page
      .getByRole("navigation", { name: "Hauptnavigation" })
      .getByRole("button", { name: new RegExp(section) })
      .click();
    const entry = page.getByRole("region", { name: `GPT für ${section}` });
    const button = entry.getByRole("button", {
      name: "GPT beauftragen",
      exact: true,
    });
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await button.click();
    if (failStudio) {
      await expect(entry.getByRole("alert")).toContainText(
        "Synthetischer Verbindungsfehler",
      );
      failStudio = false;
      await entry.getByRole("button", { name: "Erneut laden" }).click();
    }
    const message = entry.getByLabel("Deine Nachricht", { exact: true });
    await expect(message).toHaveValue(
      new RegExp(section === "Kampagnen" ? "Kampagne" : section),
    );
    await message.fill(`Synthetischer Auftrag für ${section}`);
    await expect(
      entry.getByRole("button", { name: "An GPT senden", exact: true }),
    ).toBeDisabled();
    await entry.getByRole("button", { name: "GPT-Dialog einklappen" }).click();
    await expect(message).not.toBeVisible();
    await entry
      .getByRole("button", { name: "GPT beauftragen", exact: true })
      .click();
    await expect(message).toHaveValue(`Synthetischer Auftrag für ${section}`);
    for (const width of [1440, 1024, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        (await new AxeBuilder({ page }).include(".assistant-entry").analyze())
          .violations,
      ).toEqual([]);
      mkdirSync(".local/hub-screenshots", { recursive: true });
      await page.screenshot({
        path: `.local/hub-screenshots/studio-assistant-${section.replaceAll(" ", "-")}-${width}.png`,
        fullPage: true,
      });
    }
    await page.mouse.move(0, 0);
    await expect(
      entry.getByRole("button", { name: "GPT-Dialog einklappen" }),
    ).toHaveCSS("border-radius", "10px");
    await expect(
      entry.getByRole("button", { name: "GPT-Dialog einklappen" }),
    ).toHaveCSS("background-color", "rgb(41, 125, 195)");
  }
  expect(writes).toEqual([]);
});
