/**
 * Back-compat wrapper — prefer: npx tsx scripts/migrate-ai-page.ts
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync(
  "npx",
  ["--yes", "tsx", "scripts/migrate-ai-page.ts"],
  { cwd: root, stdio: "inherit", env: process.env },
);
process.exit(result.status ?? 1);
