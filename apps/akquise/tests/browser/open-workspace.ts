import type { Page } from "@playwright/test";
import { workspaceGroup, workspaceLabel } from "../../lib/workspace-navigation";

export async function openWorkspace(page: Page, section: string) {
  if (section === "Einstellungen") {
    await page.getByRole("button", { name: section, exact: true }).click();
    return;
  }
  const group = workspaceGroup(section);
  if (!group) throw new Error(`Unbekannter Arbeitsbereich: ${section}`);
  const main = page.getByRole("navigation", { name: "Hauptnavigation", exact: true });
  await main.getByRole("button", { name: group.label, exact: true }).click();
  if (group.sections.length > 1) {
    const nav = page.getByRole("navigation", { name: `${group.label}-Navigation`, exact: true });
    await nav.getByRole("button", { name: workspaceLabel(section), exact: true }).click();
  }
}
