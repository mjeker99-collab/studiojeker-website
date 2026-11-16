import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
const url = new URL(process.env.DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1"].includes(url.hostname) || !url.password)
  throw new Error("Lokale DATABASE_URL mit Passwort erforderlich.");
const databaseDir = ".local/postgres";
const pg = new EmbeddedPostgres({
  databaseDir,
  port: Number(url.port || 5433),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  persistent: true,
  authMethod: "scram-sha-256",
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: (e) => console.error(String(e)),
});
if (!existsSync(`${databaseDir}/PG_VERSION`)) await pg.initialise();
await pg.start();
const client = pg.getPgClient();
await client.connect();
const name = url.pathname.slice(1);
if (!/^[a-z][a-z0-9_]*$/.test(name))
  throw new Error("Ungültiger Datenbankname.");
const result = await client.query(
  "SELECT 1 FROM pg_database WHERE datname=$1",
  [name],
);
if (!result.rowCount) await client.query(`CREATE DATABASE "${name}"`);
await client.end();
console.log(
  `Lokales PostgreSQL läuft auf 127.0.0.1:${url.port || 5433}. Daten bleiben unter .local/postgres erhalten.`,
);
const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
await new Promise(() => {});
