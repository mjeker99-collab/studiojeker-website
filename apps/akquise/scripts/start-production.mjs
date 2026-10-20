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
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    clearInterval(timer);
    child.kill(signal);
  });
child.on("exit", (code) => process.exit(code ?? 1));
