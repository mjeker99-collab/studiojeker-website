import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
export const logoBytes = () =>
  readFileSync(resolve(process.cwd(), "brand/studiojeker-original.svg"));
export const logoHash = () =>
  createHash("sha256").update(logoBytes()).digest("hex");
function number(name: string, fallback: number, max: number) {
  const raw = process.env[name];
  const n = raw ? Number(raw) : fallback;
  if (!Number.isFinite(n) || n <= 0 || n > max)
    throw new Error(`Ungültige Konfiguration: ${name}`);
  return n;
}
export function studioConfig() {
  const key = process.env.OPENAI_API_KEY || "";
  const enabled = process.env.CONTENT_AI_ENABLED === "true";
  const s3 = !!(
    process.env.STUDIO_S3_ENDPOINT &&
    process.env.STUDIO_S3_BUCKET &&
    process.env.STUDIO_S3_ACCESS_KEY_ID &&
    process.env.STUDIO_S3_SECRET_ACCESS_KEY
  );
  return {
    key,
    enabled,
    textModel: process.env.CONTENT_TEXT_MODEL || "gpt-4.1-mini",
    imageModel: process.env.CONTENT_IMAGE_MODEL || "gpt-image-1.5",
    dailyRequests: number("CONTENT_DAILY_REQUEST_LIMIT", 20, 1000),
    dailyBudget: number("CONTENT_DAILY_BUDGET_USD", 5, 1000),
    textReserve: number("CONTENT_TEXT_RESERVE_USD", 0.1, 100),
    imageReserve: number("CONTENT_IMAGE_RESERVE_USD", 0.25, 100),
    storage: s3
      ? "S3"
      : process.env.NODE_ENV !== "production" &&
          process.env.STUDIO_LOCAL_ASSETS === "true"
        ? "LOCAL"
        : "DISCONNECTED",
    connected: enabled && !!key,
  };
}
export function publicConfig() {
  const c = studioConfig();
  return {
    connected: c.connected,
    storage: c.storage,
    missingStorage: [
      "STUDIO_S3_ENDPOINT",
      "STUDIO_S3_BUCKET",
      "STUDIO_S3_ACCESS_KEY_ID",
      "STUDIO_S3_SECRET_ACCESS_KEY",
    ].filter((k) => !process.env[k]),
    textModel: c.textModel,
    imageModel: c.imageModel,
    dailyRequests: c.dailyRequests,
    dailyBudget: c.dailyBudget,
    textReserve: c.textReserve,
    imageReserve: c.imageReserve,
    logoSha256: logoHash(),
    costNote:
      "Budgetreservierung, kein garantierter API-Preis. Bild: Standardmodell 1024×1024, medium ca. USD 0.034 Bildausgabe plus variable Eingabe. Text: ca. USD 0.40/M Eingabe- und 1.60/M Ausgabetokens beim Standardmodell. Andere Modelle separat prüfen.",
  };
}
