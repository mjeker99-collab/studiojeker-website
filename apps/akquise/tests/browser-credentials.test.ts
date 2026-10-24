import { test } from "node:test";
import assert from "node:assert/strict";
import { browserCredentials } from "./browser/credentials";
test("Browserzugang: isolierter Harness verwendet beide Umgebungsvariablen", () => {
  assert.deepEqual(
    browserCredentials(
      { E2E_EMAIL: "martin@example.test", E2E_PASSWORD: "synthetic-test-only" },
      () => {
        throw new Error("Datei darf nicht gelesen werden");
      },
    ),
    { email: "martin@example.test", password: "synthetic-test-only" },
  );
});
test("Browserzugang: CI-Seed-Dateiformat funktioniert ohne E2E-Variablen", () => {
  assert.deepEqual(
    browserCredentials(
      {},
      () =>
        "Lokales synthetisches Konto: martin@example.test\nEinmaliges Passwort: synthetic-ci-only\nLokales synthetisches Konto: nora@example.test\nEinmaliges Passwort: another-synthetic-password\n",
    ),
    { email: "martin@example.test", password: "synthetic-ci-only" },
  );
});
test("Browserzugang: reale Konten, unvollständige Variablen und ungültige Dateien abweisen", () => {
  assert.throws(
    () =>
      browserCredentials({
        E2E_EMAIL: "real@example.com",
        E2E_PASSWORD: "test-only",
      }),
    /synthetische/,
  );
  assert.throws(
    () => browserCredentials({ E2E_EMAIL: "martin@example.test" }),
    /gemeinsam/,
  );
  assert.throws(() => browserCredentials({}, () => "kein Testzugang"), /fehlt/);
  assert.throws(
    () =>
      browserCredentials(
        {},
        () =>
          "Lokales synthetisches Konto: real@example.com\nEinmaliges Passwort: test-only",
      ),
    /synthetische/,
  );
});
