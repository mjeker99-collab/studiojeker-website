import { expect, test, type Page } from "@playwright/test";

const schedule = {
  schedule: {
    revision: 1,
    enabled: false,
    dailyLimit: 50,
    weekdaysOnly: true,
    startHour: 9,
    endHour: 17,
    intervalMinutes: 2,
    heartbeatAt: new Date().toISOString(),
    pauseReason: null,
  },
  workerHealthy: true,
  productionReady: true,
  serverLimit: 100,
  todayCount: 0,
  todaySent: 0,
  counts: [],
  items: [],
};

async function openAkquise(
  page: Page,
  notice: Record<string, unknown>,
) {
  const calls: string[] = [];
  let current = notice;
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    calls.push(`${route.request().method()} ${path}${url.search}`);
    if (path === "/api/mail-assistant/history") return route.fulfill({ json: [] });
    if (path === "/api/state") {
      return route.fulfill({
        json: {
          user: { id: "test", name: "Test" },
          users: [],
          contacts: [],
          drafts: [],
          deliveries: [],
          suppressions: [],
          audits: [],
          generator: "disabled",
          externalSending: false,
          mailMode: "disabled",
          smtpPort: null,
          smtpSecure: false,
        },
      });
    }
    if (path === "/api/mail-schedule") return route.fulfill({ json: schedule });
    if (path === "/api/drive/status" && url.searchParams.get("masterlist") === "1")
      return route.fulfill({ json: current });
    if (path === "/api/drive/connect") {
      return route.fulfill({
        json: {
          url: "https://accounts.google.com/o/oauth2/v2/auth?prompt=consent+select_account&synthetic=1",
        },
      });
    }
    if (path === "/api/drive/disconnect" || path.startsWith("/api/smtp")) {
      return route.fulfill({ status: 500, json: { error: "unerlaubt" } });
    }
    return route.fulfill({ json: {} });
  });
  await page.route("https://accounts.google.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Synthetische Google-Anmeldung</title><p>Synthetische Anmeldung</p>",
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Was möchtest du heute erledigen?" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: "Akquise", exact: true })
    .click();
  await expect(page.getByRole("navigation", { name: "Akquise-Navigation" })).toBeVisible();
  return {
    calls,
    markReady() {
      current = { role: "self", access: "ready", folderName: "Adressen" };
    },
  };
}

for (const width of [390, 1280]) {
  test(`Google consent renewal is the only action at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const { calls } = await openAkquise(page, {
      role: "self",
      access: "consent_required",
      folderName: "Adressen",
    });
    const notice = page.locator(".google-reconnect");
    await expect(
      notice.getByRole("heading", { name: "Google-Verbindung erneuern" }),
    ).toBeVisible();
    await expect(notice).toContainText("Ordner «Adressen»");
    await expect(notice).toContainText("dasselbe Google-Konto");
    await expect(notice).toContainText("keine E-Mail");
    await expect(notice).not.toContainText(/OAuth|Token|refresh/i);
    await expect(notice.getByRole("button")).toHaveCount(1);
    await expect(notice.getByRole("button")).toHaveText(
      "Google-Verbindung erneuern",
    );
    await page.screenshot({
      path: `/opt/cursor/artifacts/google-reconnect-consent-${width}.png`,
      fullPage: false,
    });
    await notice.getByRole("button").click();
    await expect(page).toHaveURL(/prompt=consent\+select_account/);
    await expect(page.getByText("Synthetische Anmeldung")).toBeVisible();
    expect(calls.some((call) => call.includes("/api/drive/disconnect"))).toBe(
      false,
    );
    expect(calls.some((call) => call.includes("/api/smtp"))).toBe(false);
    expect(calls.some((call) => call === "POST /api/drive/connect")).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });

  test(`unreachable Google stays friendly and sends no mail at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const { calls, markReady } = await openAkquise(page, {
      role: "self",
      access: "unreachable",
      folderName: "Adressen",
    });
    const notice = page.locator(".google-reconnect");
    await expect(
      notice.getByRole("heading", {
        name: "Google ist gerade nicht erreichbar",
      }),
    ).toBeVisible();
    await expect(notice).toContainText("keine E-Mail");
    await expect(notice).not.toContainText(/OAuth|Token|HTTP|500/i);
    await expect(
      page.getByRole("button", { name: "Google-Verbindung erneuern" }),
    ).toHaveCount(0);
    await expect(notice.getByRole("button")).toHaveCount(1);
    if (width === 390)
      await page.screenshot({
        path: "/opt/cursor/artifacts/google-reconnect-unreachable-mobile.png",
        fullPage: false,
      });
    markReady();
    await notice.getByRole("button", { name: "Erneut prüfen" }).click();
    await expect(
      page.getByRole("heading", { name: "Google ist gerade nicht erreichbar" }),
    ).toHaveCount(0);
    expect(calls.some((call) => call.includes("/api/smtp"))).toBe(false);
    expect(calls.some((call) => call.includes("/api/drive/disconnect"))).toBe(
      false,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

for (const width of [390, 1280]) {
  test(`another person cannot renew the designated Google connection at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const { calls } = await openAkquise(page, {
      role: "other",
      access: "consent_required",
      actorName: "Martin",
    });
    const notice = page.locator(".google-reconnect");
    await expect(
      notice.getByRole("heading", { name: "Google-Verbindung von Martin" }),
    ).toBeVisible();
    await expect(notice).toContainText("von Martin aktualisiert");
    await expect(notice).toContainText("ändert die Liste nicht");
    await expect(notice).toContainText("keine E-Mail");
    await expect(notice.getByRole("button")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Google-Verbindung erneuern" }),
    ).toHaveCount(0);
    expect(calls.some((call) => call.startsWith("POST /api/drive/connect"))).toBe(
      false,
    );
    expect(calls.some((call) => call.includes("/api/smtp"))).toBe(false);
    expect(calls.some((call) => call.includes("/api/drive/disconnect"))).toBe(
      false,
    );
    await page.screenshot({
      path: `/opt/cursor/artifacts/google-reconnect-other-account-${width}.png`,
      fullPage: false,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });

  test(`a missing designated grant stays with that person at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const other = await openAkquise(page, {
      role: "other",
      access: "missing",
      actorName: "Martin",
    });
    await expect(page.locator(".google-reconnect")).toContainText(
      "noch nicht eingerichtet",
    );
    await expect(
      page.getByRole("button", { name: "Google-Verbindung erneuern" }),
    ).toHaveCount(0);
    expect(
      other.calls.some((call) => call.startsWith("POST /api/drive/connect")),
    ).toBe(false);
    await page.goto("/");
    const self = await openAkquise(page, {
      role: "self",
      access: "missing",
      folderName: null,
    });
    const notice = page.locator(".google-reconnect");
    await expect(notice).toContainText("noch keine Google-Verbindung");
    await expect(notice.getByRole("button")).toHaveText(
      "Google-Verbindung erneuern",
    );
    await notice.getByRole("button").click();
    await expect(page).toHaveURL(/prompt=consent\+select_account/);
    expect(self.calls.some((call) => call.includes("/api/smtp"))).toBe(false);
    expect(
      self.calls.some((call) => call.includes("/api/drive/disconnect")),
    ).toBe(false);
  });
}
