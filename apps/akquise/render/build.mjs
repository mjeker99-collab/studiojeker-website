import { rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";

// Remove only our generated artifact, so cached/manual rebuilds are repeatable.
await rm(".render/runtime", { recursive: true, force: true });
for (const args of [
  ["ci", "--include=dev"],
  ["run", "db:generate"],
  ["run", "build"],
  ["run", "release:package", "--", ".render/runtime"],
]) {
  const result = spawnSync("npm", args, { stdio: "inherit" });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
