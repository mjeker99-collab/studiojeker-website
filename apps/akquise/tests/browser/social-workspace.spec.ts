import { test, expect, type Page } from "@playwright/test";

const user = {
  id: "user-social",
  name: "Nora Jeker",
  email: "nora@example.test",
};

function socialPayload(title: string) {
  return {
    kind: "SOCIAL",
    title,
    ownerId: user.id,
    campaignId: null,
    scheduledAt: null,
    subject: "",
    preheader: "",
    body: "",
    audience: "",
    variants: [
      {
        channel: "LINKEDIN",
        text: "Publishing-Text für " + title,
        link: "",
        cta: "",
        mediaType: "NONE",
        mediaUrl: "",
        mediaReference: "",
        scheduledAt: null,
      },
    ],
  };
}

function content(
  id: string,
  title: string,
  workspace: "SOCIAL_POST" | "GPT_DIALOG" | "CONTENT_DRAFT",
  archivedAt: string | null = null,
) {
  return {
    id,
    kind: "SOCIAL",
    workspace,
    title,
    version: 1,
    status: "DRAFT",
    campaignId: null as string | null,
    ownerId: user.id,
    scheduledAt: null,
    archivedAt,
    versions: [{ version: 1, payload: socialPayload(title) }],
    approvals: [],
    publications: [],
    exports: [],
    mailchimpTransfers: [],
  };
}

async function mockHub(page: Page, contents: ReturnType<typeof content>[]) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/state")
      return route.fulfill({
        json: {
          user,
          users: [{ id: user.id, name: user.name }],
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
          contents,
          users: [{ id: user.id, name: user.name }],
          drafts: [],
          customers: [],
          integrations: {
            linkedin: "NOT_CONNECTED",
            instagram: "NOT_CONNECTED",
            facebook: "NOT_CONNECTED",
            mailchimp: "NOT_CONNECTED",
          },
        },
      });
    if (path === "/api/studio/state")
      return route.fulfill({
        json: {
          assistantUser: {
            id: user.id,
            name: user.name,
            studioContext: "",
            studioContextRevision: 1,
          },
          organization: { name: "Studiojeker", revision: 1 },
          series: [],
          assets: [],
          brand: {},
          jobs: [],
          campaigns: [],
          users: [{ id: user.id, name: user.name }],
          customers: [],
          config: {
            connected: false,
            storage: "DISCONNECTED",
            textReserve: 0.1,
            imageReserve: 0.5,
          },
        },
      });
    if (path.startsWith("/api/hub/promote-social/")) {
      const id = path.split("/").pop()!;
      const item = contents.find((c) => c.id === id)!;
      const body = request.postDataJSON() as {
        version: number;
        campaignId?: string | null;
      };
      item.workspace = "SOCIAL_POST";
      if (body.campaignId !== undefined) item.campaignId = body.campaignId;
      return route.fulfill({ json: item });
    }
    if (path === "/api/hub/dialogs/manage") {
      const body = request.postDataJSON() as {
        action: "archive" | "restore" | "delete";
        items: { id: string; version: number }[];
      };
      for (const item of body.items) {
        const index = contents.findIndex((c) => c.id === item.id);
        if (index < 0)
          return route.fulfill({
            status: 404,
            json: { error: "Dialog nicht gefunden." },
          });
        const row = contents[index];
        if (body.action === "archive") row.archivedAt = new Date().toISOString();
        else if (body.action === "restore") row.archivedAt = null;
        else contents.splice(index, 1);
      }
      return route.fulfill({
        json: { ok: true, action: body.action, results: body.items },
      });
    }
    return route.fulfill({
      json: { connections: [], configured: { meta: false, linkedin: false } },
    });
  });
}

test("Social Media list hides GPT dialogs until promote", async ({ page }) => {
  const items = [
    content("post-1", "Publishing Post", "SOCIAL_POST"),
    content("dialog-1", "KI Dialog Stub", "GPT_DIALOG"),
    content("draft-1", "Content Entwurf", "CONTENT_DRAFT"),
  ];
  await mockHub(page, items);
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Social Media/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Beiträge planen, prüfen und freigeben" }),
  ).toBeVisible();
  await expect(
    page.locator('[data-content-id="post-1"]'),
  ).toBeVisible();
  await expect(page.locator('[data-content-id="dialog-1"]')).toHaveCount(0);
  await expect(page.locator('[data-content-id="draft-1"]')).toHaveCount(0);
  const promote = page.getByRole("region", {
    name: "Zur Übernahme in Social Media",
  });
  await expect(promote).toBeVisible();
  await expect(promote.getByRole("heading", { name: "KI Dialog Stub" })).toBeVisible();
  await expect(
    promote.getByRole("heading", { name: "Content Entwurf" }),
  ).toBeVisible();
  await promote
    .getByRole("button", { name: "In Social Media übernehmen" })
    .first()
    .click();
  await expect(page.getByRole("status")).toHaveText(/übernommen/i);
  await expect(page.locator('[data-content-id="dialog-1"]')).toBeVisible();
});

test("Dialogverwaltung iPad: Löschen-Button und Mehrfachauswahl sichtbar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 1366 });
  const items = [
    content("post-ipad", "Publishing Post", "SOCIAL_POST"),
    content("dialog-ipad", "iPad Dialog", "GPT_DIALOG"),
  ];
  await mockHub(page, items);
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Social Media/ })
    .click();
  const promote = page.getByRole("region", {
    name: "Zur Übernahme in Social Media",
  });
  await expect(promote.getByText("Alle auswählen")).toBeVisible();
  await expect(
    promote.getByRole("button", { name: "«iPad Dialog» löschen" }),
  ).toBeVisible();
  await expect(
    promote.getByRole("button", { name: "Ausgewählte löschen" }),
  ).toBeVisible();
});

test("Dialogverwaltung: löschen mit Sicherheitsabfrage und Archivfilter", async ({
  page,
}) => {
  const items = [
    content("post-keep", "Publishing Post", "SOCIAL_POST"),
    content("dialog-del", "Löschbarer Dialog", "GPT_DIALOG"),
    content("dialog-arch", "Archiv-Dialog", "GPT_DIALOG"),
  ];
  await mockHub(page, items);
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: /Social Media/ })
    .click();
  const promote = page.getByRole("region", {
    name: "Zur Übernahme in Social Media",
  });
  await expect(
    promote.getByRole("heading", { name: "Löschbarer Dialog" }),
  ).toBeVisible();
  await promote.getByRole("button", { name: "«Löschbarer Dialog» löschen" }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText("Löschbarer Dialog");
  await confirm.getByRole("button", { name: "Endgültig löschen" }).click();
  await expect(page.getByRole("status")).toHaveText(/gelöscht/i);
  await expect(
    promote.getByRole("heading", { name: "Löschbarer Dialog" }),
  ).toHaveCount(0);
  await expect(page.locator('[data-content-id="post-keep"]')).toBeVisible();

  await promote.getByRole("button", { name: "Archivieren", exact: true }).click();
  const archiveConfirm = page.getByRole("alertdialog");
  await expect(archiveConfirm).toContainText("Archiv-Dialog");
  await archiveConfirm
    .getByRole("button", { name: "Archivieren", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText(/archiviert/i);
  await promote.getByRole("button", { name: "Archiv", exact: true }).click();
  await expect(
    promote.getByRole("heading", { name: "Archiv-Dialog" }),
  ).toBeVisible();
  await promote
    .getByRole("button", { name: "Wiederherstellen", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Wiederherstellen", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText(/wiederhergestellt/i);
  await promote.getByRole("button", { name: "Aktiv", exact: true }).click();
  await expect(
    promote.getByRole("heading", { name: "Archiv-Dialog" }),
  ).toBeVisible();
});

for (const width of [390, 1024, 1440]) {
  test(`Social connection selects the company after personal login at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await mockHub(page, []);
    let selected = false;
    const source = "personal-member";
    const organizationId = "urn:li:organization:77";
    await page.route("**/api/social/**", async (route) => {
      const request = route.request();
      const address = new URL(request.url());
      if (address.pathname.endsWith("/status"))
        return route.fulfill({
          json: {
            configured: { meta: false, linkedin: true },
            setup: {
              meta: {
                sandbox: false,
                checks: [{ key: "META_CLIENT_ID", ready: false }],
                redirectUri:
                  "https://studiojeker-akquise.onrender.com/api/social/meta/callback",
              },
              linkedin: {
                sandbox: false,
                checks: [{ key: "LINKEDIN_CLIENT_ID", ready: true }],
                redirectUri:
                  "https://studiojeker-akquise.onrender.com/api/social/linkedin/callback",
              },
            },
            connections: [
              {
                provider: "LINKEDIN",
                accountId: selected ? organizationId : source,
                accountName: selected ? "Studiojeker" : "Personal member",
                ownerId: user.id,
                expired: false,
                needsOrganization: !selected,
              },
            ],
          },
        });
      if (address.pathname.endsWith("/organizations")) {
        expect(address.searchParams.get("accountId")).toBe(source);
        return route.fulfill({
          json: {
            organizations: [
              {
                accountId: organizationId,
                accountName: "Studiojeker",
                url: "https://www.linkedin.com/company/studiojeker/",
              },
            ],
          },
        });
      }
      expect(address.pathname).toBe("/api/social/linkedin/organization");
      expect(request.method()).toBe("POST");
      expect(request.postDataJSON()).toEqual({
        accountId: source,
        organizationId,
      });
      selected = true;
      return route.fulfill({ json: { ok: true } });
    });
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Hauptnavigation" })
      .getByRole("button", { name: /Social Media/ })
      .click();
    const panel = page.getByRole("region", { name: "Social-Media-Konten" });
    await expect(
      panel.getByText(/Anmeldung erfolgt – Unternehmensseite noch auswählen/),
    ).toBeVisible();
    await expect(
      panel.getByRole("button", { name: "Facebook & Instagram verbinden" }),
    ).toBeDisabled();
    await panel.getByText("Einrichtungsdetails", { exact: true }).click();
    await expect(panel.getByText("META_CLIENT_ID")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await panel
      .getByRole("button", { name: "Unternehmensseite auswählen", exact: true })
      .click();
    await panel
      .getByRole("button", { name: "Diese Unternehmensseite verbinden" })
      .click();
    await expect(panel.getByRole("status")).toContainText(
      "Unternehmensseite verbunden",
    );
    await expect(
      panel.getByText(/LinkedIn: Studiojeker · verbunden/),
    ).toBeVisible();
    await expect(
      panel.getByRole("button", { name: "Seitenrechte prüfen" }),
    ).toBeVisible();
  });
}
