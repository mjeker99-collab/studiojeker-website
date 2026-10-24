import { spawn } from "node:child_process";
import { configureRender } from "./config.mjs";

const action = process.argv[2];
if (
  !["start", "migrate", "create-user", "reset-password", "inventory"].includes(
    action,
  )
)
  throw new Error(
    "Aktion: start, migrate, create-user, reset-password oder inventory.",
  );
configureRender();
const commands = {
  start: ["scripts/start-production.mjs"],
  migrate: ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  "create-user": [
    "--import",
    "tsx",
    "scripts/create-user.ts",
    ...process.argv.slice(3),
  ],
  "reset-password": [
    "--import",
    "tsx",
    "scripts/reset-password.ts",
    ...process.argv.slice(3),
  ],
  inventory: ["--import", "tsx", "scripts/data-inventory.ts"],
};
const env = { ...process.env };
if (action === "migrate" && env.MIGRATION_DATABASE_URL)
  env.DATABASE_URL = env.MIGRATION_DATABASE_URL;
const child = spawn(process.execPath, commands[action], {
  cwd: action === "start" ? ".render/runtime" : process.cwd(),
  env,
  stdio: "inherit",
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("error", () => process.exit(1));
child.on("exit", (code) => process.exit(code ?? 1));
