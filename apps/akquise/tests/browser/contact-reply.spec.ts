import { test, expect } from "@playwright/test";
for (const width of [390, 1024]) {
  test("Antwort erfassen und Wiedervorlage anzeigen " + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    let saved = false;
    let payload: Record<string, unknown> = {};
    const contact = {
      id: "reply-contact", organisation: "Beispielfirma", firstName: "Anna", lastName: "Muster",
      email: "anna@example.test", status: "SENT", revision: 1, verifiedAt: null,
      confidence: "UNCONFIRMED", legalReviews: [], notes: "", sourceUrl: "", hook: "",
    };
    await page.route("**/api/**", async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/state") return route.fulfill({ json: {
        user: { id: "test", name: "Test" }, users: [], contacts: [{ ...contact,
          ...(saved ? { status: "REPLIED", replyOutcome: "NO_NEED", followUpOn: "2027-04-29", revision: 2 } : {}) }],
        drafts: [], deliveries: [], suppressions: [], audits: [], generator: "disabled", mailMode: "disabled", externalSending: false,
      } });
      if (path === "/api/contacts/reply-contact/reply") {
        payload = route.request().postDataJSON(); saved = true;
        return route.fulfill({ json: { ok: true } });
      }
      if (path === "/api/hub/state") return route.fulfill({ json: { campaigns: [], contents: [], users: [], drafts: [], customers: [], integrations: {}, events: [] } });
      return route.fulfill({ status: 503, json: { error: "Not used" } });
    });
    await page.goto("/");
    await page.getByRole("button", { name: /Kontakte\/Akquise/ }).click();
    await page.getByRole("button", { name: "Kontakte", exact: true }).click();
    await page.getByRole("button", { name: "Beispielfirma", exact: true }).click();
    const panel = page.getByRole("region", { name: "Antwort erfassen" });
    await panel.getByRole("button", { name: "Derzeit kein Bedarf", exact: true }).click();
    await panel.getByLabel("Antwort / Notiz (optional)").fill("Dieses Jahr kein Bedarf");
    await panel.getByLabel("Wiedervorlage (optional)").fill("2027-04-29");
    await panel.getByRole("button", { name: "Antwort speichern", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(payload).toEqual({ revision: 1, outcome: "NO_NEED", note: "Dieses Jahr kein Bedarf", followUpOn: "2027-04-29" });
    await expect(page.getByText("Wiedervorlage: 29.04.2027", { exact: true })).toBeVisible();
  });
}
