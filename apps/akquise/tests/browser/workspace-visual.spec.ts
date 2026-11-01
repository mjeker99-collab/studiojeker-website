import { test, expect } from "@playwright/test";
import { browserCredentials } from "./credentials";

const areas = [
  "Kontakte/Akquise", "Kunden", "Strategie & Konzepte", "Kampagnen",
  "Social Media", "Content-Studio", "Bibliothek", "Newsletter",
  "Website", "Kalender", "Einstellungen",
];
for (const width of [390, 768, 1440]) {
  test(`Bereichsgestaltung ${width}px: lesbare Einstiege, bündige Kanten und erreichbare Aktionen`, async ({ page }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width, height: 1000 });
    const credentials = browserCredentials();
    await page.goto("/");
    await page.getByLabel("E-Mail", { exact: true }).fill(credentials.email);
    await page.getByLabel("Passwort", { exact: true }).fill(credentials.password);
    await page.getByRole("button", { name: /Sicher anmelden/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Übersicht", exact: true })).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
    for (const [index, area] of areas.entries()) {
      await nav.getByRole("button", { name: new RegExp(area) }).click();
      const hero = page.locator(".studioone-area-intro");
      await expect(hero).toBeVisible();
      await expect(hero.locator(".studioone-area-watermark")).toHaveAttribute("aria-hidden", "true");
      await expect(hero.getByRole("heading", { level: 2 })).toBeVisible();
      const layout = await hero.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const content = document.querySelector("main.content")!;
        const main = content.getBoundingClientRect();
        const styles = getComputedStyle(content);
        const innerLeft = main.left + parseFloat(styles.paddingLeft);
        const innerRight = main.right - parseFloat(styles.paddingRight);
        return {
          left: Math.abs(box.left - innerLeft),
          right: Math.abs(box.right - innerRight),
          overflow: document.documentElement.scrollWidth > innerWidth,
          clipped: [...element.querySelectorAll("button")].filter(button => !button.disabled).some(button => {
            const rect = button.getBoundingClientRect();
            return rect.left < box.left || rect.right > box.right;
          }),
        };
      });
      expect(layout.overflow, area).toBe(false);
      expect(layout.clipped, area).toBe(false);
      expect(layout.left, area).toBeLessThan(2);
      expect(layout.right, area).toBeLessThan(2);
      if (area === "Kontakte/Akquise") {
        const panel = page.locator(".mail-studio-workspace > section.panel").first();
        if (await panel.isVisible()) {
          const card = await panel.boundingBox();
          const intro = await hero.boundingBox();
          expect(Math.abs(card!.x - intro!.x)).toBeLessThan(2);
          expect(Math.abs(card!.width - intro!.width)).toBeLessThan(2);
        }
      }
      await hero.screenshot({ path: `.local/hub-screenshots/studio-area-${width}-${index}.png` });
    }
  });
}
