import { cp, mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, basename, join } from "node:path";
const target = resolve(process.argv[2] || ".local/production-artifact");
if (existsSync(target))
  throw new Error("Ziel existiert bereits; neuen leeren Release-Pfad wählen.");
if (!existsSync(".next/standalone/server.js"))
  throw new Error("Zuerst npm run build ausführen.");
const forbidden = (name) =>
  name.startsWith(".env") ||
  name === ".local" ||
  name.startsWith("demo-access") ||
  name === "seed.ts" ||
  /\.(pem|key|dump|partial)$/.test(name);
await mkdir(target, { recursive: true });
await cp(".next/standalone", target, {
  recursive: true,
  filter: (path) => !forbidden(basename(path)),
});
await cp(".next/static", join(target, ".next/static"), { recursive: true });
await mkdir(join(target, "scripts"), { recursive: true });
await mkdir(join(target, "lib"), { recursive: true });
await cp(
  "scripts/start-production.mjs",
  join(target, "scripts/start-production.mjs"),
);
await cp("lib/config.mjs", join(target, "lib/config.mjs"));
async function inspect(dir) {
  for (const name of await readdir(dir)) {
    if (forbidden(name))
      throw new Error("Unzulässiger Inhalt im Release-Artefakt.");
    const path = join(dir, name);
    if ((await stat(path)).isDirectory()) await inspect(path);
  }
}
await inspect(target);
console.log(
  "Produktionsartefakt erstellt und auf lokale Secret-Dateien geprüft.",
);
