// Local-only review harness: existing public data and credentials are never changed.
import { openSync, closeSync, cpSync, existsSync, mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth";
const url = new URL(process.env.DATABASE_URL || "");
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("Nur lokale PostgreSQL-Instanz erlaubt.");
try {
  await fetch("http://localhost:3100/api/health/live");
  throw new Error(
    "Port 3100 ist belegt. Eigenen Entwicklungsserver zuerst beenden.",
  );
} catch (e) {
  if (e instanceof Error && e.message.startsWith("Port")) throw e;
}
const schema = "browser_" + randomBytes(8).toString("hex");
url.searchParams.set("schema", schema);
const env = {
  ...process.env,
  DATABASE_URL: url.toString(),
  APP_URL: "http://localhost:3100",
  NODE_ENV: "development" as const,
  MAIL_MODE: "disabled",
  ENABLE_EMAIL_SENDING: "false",
  SMTP_CONFIGURATION_CONFIRMED: "false",
  STUDIO_LOCAL_ASSETS: "true",
  CONTENT_AI_ENABLED: "false",
  OPENAI_API_KEY: "",
  E2E_EMAIL: "martin@example.test",
  E2E_PASSWORD: randomBytes(24).toString("base64url"),
};
const client = new PrismaClient({ datasourceUrl: url.toString() });
let server: ChildProcess | undefined;
const log = openSync(".local/review-server.log", "w", 0o600);
try {
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    {
      env: { ...env, NODE_TEST_CONTEXT: undefined },
      stdio: "pipe",
      timeout: 20000,
    },
  );
  for (const [name, email] of [
    ["Martin Jeker", env.E2E_EMAIL],
    ["Nora Jeker", "nora@example.test"],
  ])
    await client.user.create({
      data: { name, email, passwordHash: hashPassword(env.E2E_PASSWORD) },
    });
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--webpack",
      "--port",
      "3100",
      "--hostname",
      "127.0.0.1",
    ],
    { env, stdio: ["ignore", log, log] },
  );
  let ready = false;
  for (let n = 0; n < 120; n++) {
    if (server!.exitCode !== null)
      throw new Error("Testserver konnte nicht starten.");
    try {
      if ((await fetch("http://localhost:3100/api/health/ready")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error("Readiness des Testservers fehlt.");
  const tests = spawn(
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
    { env, stdio: "inherit" },
  );
  const result = await new Promise<number>((resolve) =>
    tests.on("exit", (code) => resolve(code ?? 1)),
  );
  process.exitCode = result;
} finally {
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await new Promise((resolve) => server!.once("exit", resolve));
  }
  if (process.exitCode === 0 && existsSync(".local/hub-screenshots")) {
    mkdirSync("docs/screenshots", { recursive: true });
    cpSync(".local/hub-screenshots", "docs/screenshots", { recursive: true });
  }
  await client.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await client.$disconnect();
  closeSync(log);
}
