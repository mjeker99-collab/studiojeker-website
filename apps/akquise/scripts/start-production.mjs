import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { validateProduction } from "../lib/config.mjs";
process.env.NODE_ENV = "production";
try {
  validateProduction();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
// The artifact contains an allowlisted set of files; refuse leaked local credentials.
for (const path of [
  ".local/demo-access.txt",
  "public/demo-access.txt",
  "public/.env",
])
  if (existsSync(path)) {
    console.error(
      "Lokale Zugangsdaten im Produktionsartefakt gefunden. Start verweigert.",
    );
    process.exit(1);
  }
const standalone = existsSync("server.js");
// Ephemeral per-process credential. Never exposed to the browser or stored in settings.
const tickToken = randomBytes(32).toString("hex");
// Independent, ephemeral credential for the additive Google masterlist import.
// Never reuses the SMTP scheduler token and never grants sending privileges.
const contactSyncToken = randomBytes(32).toString("hex");
const contactSyncEnabled = Boolean(process.env.GOOGLE_SHEET_ID) &&
  process.env.DISABLE_CONTACT_SYNC !== "true";
const child = spawn(
  process.execPath,
  standalone
    ? ["server.js"]
    : [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "0.0.0.0",
        "--port",
        process.env.PORT || "3100",
      ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      HOSTNAME: "0.0.0.0",
      PORT: process.env.PORT || "3100",
      INTERNAL_MAIL_TICK_TOKEN: tickToken,
      INTERNAL_CONTACT_SYNC_TOKEN: contactSyncToken,
    },
  },
);
let ticking = false;
const timer = setInterval(async () => {
  if (ticking) return;
  ticking = true;
  try {
    const response = await fetch(
      `http://127.0.0.1:${process.env.PORT || "3100"}/api/internal/mail-tick`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${tickToken}` },
        signal: AbortSignal.timeout(90000),
      },
    );
    if (!response.ok)
      console.error("Mail scheduler unavailable:", response.status);
  } catch {
    console.error("Mail scheduler unavailable; retrying next minute.");
  } finally {
    ticking = false;
  }
}, 60000);
timer.unref();

// Keep StudioONE contacts in sync with the existing Google masterlist.
// The endpoint only imports missing records as UNCONFIRMED/NEW; it cannot
// approve contacts or drafts and it never triggers a delivery.
let contactSyncRunning = false;
async function syncMasterContacts() {
  if (!contactSyncEnabled || contactSyncRunning) return;
  contactSyncRunning = true;
  try {
    const response = await fetch(
      `http://127.0.0.1:${process.env.PORT || "3100"}/api/internal/contact-sync`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${contactSyncToken}` },
        signal: AbortSignal.timeout(120000),
      },
    );
    if (!response.ok) {
      console.error("Masterlist sync unavailable:", response.status);
    } else {
      const result = await response.json();
      if (result?.ok === true &&
          Number.isInteger(result.imported) &&
          Number.isInteger(result.duplicates)) {
        console.info(
          `Masterlist sync: ${result.imported} new, ${result.duplicates} already present.`,
        );
      } else {
        console.error("Masterlist sync returned an invalid response.");
      }
    }
  } catch {
    console.error("Masterlist sync unavailable; retrying next interval.");
  } finally {
    contactSyncRunning = false;
  }
}
// First pass after startup, then every 30 minutes. Restarts are harmless:
// importContacts uses skipDuplicates and never resets manual approvals.
const firstContactSync = contactSyncEnabled
  ? setTimeout(syncMasterContacts, 120000)
  : null;
firstContactSync?.unref();
const contactSyncTimer = contactSyncEnabled
  ? setInterval(syncMasterContacts, 30 * 60000)
  : null;
contactSyncTimer?.unref();
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    clearInterval(timer);
    if (firstContactSync) clearTimeout(firstContactSync);
    if (contactSyncTimer) clearInterval(contactSyncTimer);
    child.kill(signal);
  });
child.on("exit", (code) => process.exit(code ?? 1));
