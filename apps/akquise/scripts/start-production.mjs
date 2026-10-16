import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
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
    },
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 1));
