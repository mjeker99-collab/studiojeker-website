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
) {
  return {
    id,
    kind: "SOCIAL",
    workspace,
    title,
    version: 1,
    status: "DRAFT",
    campaignId: null,
    ownerId: user.id,
    scheduledAt: null,
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
      item.workspace = "SOCIAL_POST";
      return route.fulfill({ json: item });
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
