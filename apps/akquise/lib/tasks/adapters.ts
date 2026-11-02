import { driveConfigured } from "../drive/service";
import { deployIdentity } from "../deploy-identity";
import { getSanityWriteToken } from "../site-cms/config";
import { studioConfig } from "../studio/config";
import { CURSOR_ADAPTER_BLOCK } from "./layout";

export type ConnectionState = "CONNECTED" | "CONFIGURED" | "NOT_CONNECTED";

export type ToolConnection = {
  id: "gpt" | "cursor" | "github" | "render" | "sanity" | "drive" | "exoscale";
  state: ConnectionState;
  detail: string;
};

/**
 * Declarative status from modules that already exist. CONNECTED is only used
 * for the same OpenAI gate the Content-Studio already uses. No live probes.
 *
 * Cursor stays NOT_CONNECTED until PR #322
 * (feat/studioone-newsletter-cursor-bridge-20261102) is reviewed and wired.
 * That PR owns lib/cursor/contract.ts, lib/cursor/newsletter.ts and
 * NewsletterCursor.tsx. This engine does not copy them.
 */
export function connectionRegistry(
  env: Record<string, string | undefined> = process.env,
): ToolConnection[] {
  const studio = studioConfig();
  const identity = deployIdentity(env);
  const storage = studio.storage === "S3";
  return [
    {
      id: "gpt",
      state: studio.connected ? "CONNECTED" : "NOT_CONNECTED",
      detail: studio.connected
        ? "KI-Anbindung für Textentwürfe ist aktiv."
        : "KI-Anbindung fehlt. OPENAI_API_KEY und CONTENT_AI_ENABLED werden serverseitig benötigt.",
    },
    {
      id: "cursor",
      state: "NOT_CONNECTED",
      detail: CURSOR_ADAPTER_BLOCK,
    },
    {
      id: "github",
      state: "NOT_CONNECTED",
      detail: "Kein GitHub-Schreibmodul in StudioONE. Nicht als verbunden gemeldet.",
    },
    {
      id: "render",
      state: "NOT_CONNECTED",
      detail: identity.service
        ? `Laufender Dienst ${identity.service}. Keine Render-API angebunden.`
        : "Keine Render-API angebunden.",
    },
    {
      id: "sanity",
      state: getSanityWriteToken() ? "CONFIGURED" : "NOT_CONNECTED",
      detail: getSanityWriteToken()
        ? "Sanity-Schreibtoken vorhanden. Veröffentlichung bleibt separat gesperrt."
        : "Kein Sanity-Schreibtoken.",
    },
    {
      id: "drive",
      state: driveConfigured() ? "CONFIGURED" : "NOT_CONNECTED",
      detail: driveConfigured()
        ? "Google-Drive-Client ist konfiguriert. Die Anmeldung bleibt nutzerbezogen."
        : "Google Drive ist nicht konfiguriert.",
    },
    {
      id: "exoscale",
      state: storage ? "CONFIGURED" : "NOT_CONNECTED",
      detail: storage
        ? "Objektspeicher-Konfiguration vorhanden."
        : "Objektspeicher ist nicht verbunden.",
    },
  ];
}
