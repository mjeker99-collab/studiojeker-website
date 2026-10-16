import { test } from "node:test";
import assert from "node:assert/strict";
import {
  appOrigin,
  allowedAccount,
  validateProduction,
  readMailConfig,
  sessionCookieName,
} from "../lib/config.mjs";
const production = {
  NODE_ENV: "production" as const,
  APP_URL: "https://akquise.studiojeker.ch",
  DATABASE_URL:
    "postgresql://akquise:synthetic-long-password-only@db:5432/akquise",
  MARTIN_EMAIL: "martin@studiojeker.ch",
  NORA_EMAIL: "nora@studiojeker.ch",
  MAIL_MODE: "disabled",
  ENABLE_EMAIL_SENDING: "false",
};
test("Produktion verlangt HTTPS, Datenbanksecret und individuelle echte Konten", () => {
  assert.doesNotThrow(() => validateProduction(production));
  for (const APP_URL of [
    "",
    "http://localhost:3100",
    "https://localhost",
    "https://akquise.studiojeker.ch/path",
  ])
    assert.throws(() => validateProduction({ ...production, APP_URL }));
  assert.throws(() =>
    validateProduction({
      ...production,
      DATABASE_URL: "postgresql://x:password@db/x",
    }),
  );
  assert.throws(() =>
    validateProduction({ ...production, MARTIN_EMAIL: "martin@example.test" }),
  );
  assert.throws(() =>
    validateProduction({ ...production, NORA_EMAIL: production.MARTIN_EMAIL }),
  );
  assert.throws(() =>
    validateProduction({ ...production, ALLOW_SYNTHETIC_SEED: "true" }),
  );
});
test("Host-Cookie und Konten-Allowlist schützen Produktion vor Demo-Logins", () => {
  assert.equal(sessionCookieName(production), "__Host-akquise-session");
  assert.equal(
    allowedAccount(
      { name: "Martin Jeker", email: production.MARTIN_EMAIL },
      production,
    ),
    true,
  );
  assert.equal(
    allowedAccount(
      { name: "Nora Jeker", email: production.NORA_EMAIL },
      production,
    ),
    true,
  );
  assert.equal(
    allowedAccount(
      { name: "Martin Jeker", email: "martin@example.test" },
      production,
    ),
    false,
  );
  assert.equal(
    allowedAccount(
      { name: "Fremder Benutzer", email: production.MARTIN_EMAIL },
      production,
    ),
    false,
  );
  assert.equal(appOrigin({ NODE_ENV: "development" }), "http://localhost:3100");
});
const smtp = {
  ...production,
  MAIL_MODE: "test",
  ENABLE_EMAIL_SENDING: "true",
  SMTP_CONFIGURATION_CONFIRMED: "true",
  SMTP_HOST: "jovinus.metanet.ch",
  SMTP_USER: "njeker@studiojeker.ch",
  MAIL_FROM: "njeker@studiojeker.ch",
  SMTP_PASSWORD: "synthetic-not-a-real-password",
  SMTP_PORT: "587",
  SMTP_SECURE: "false",
  TEST_MAIL_RECIPIENTS: "nora@studiojeker.ch",
};
test("SMTP ist standardmässig blockiert; ein Schalter allein reicht nicht", () => {
  assert.equal(readMailConfig(production).smtpAllowed, false);
  assert.throws(() =>
    readMailConfig({ ...production, ENABLE_EMAIL_SENDING: "true" }),
  );
  assert.throws(() =>
    readMailConfig({ ...smtp, SMTP_CONFIGURATION_CONFIRMED: "false" }),
  );
  assert.throws(() => readMailConfig({ ...smtp, SMTP_PASSWORD: "" }));
  assert.throws(() => readMailConfig({ ...smtp, SMTP_SECURE: "yes" }));
  assert.throws(() => readMailConfig({ ...smtp, SMTP_PORT: "0" }));
  assert.equal(readMailConfig(smtp).smtpAllowed, true);
});
test("Interner Testmodus erlaubt nur festgelegte interne Adressen", () => {
  for (const TEST_MAIL_RECIPIENTS of [
    "",
    "contact@example.test",
    "nora@studiojeker.ch,external@example.test",
    "*@studiojeker.ch",
    "Nora <nora@studiojeker.ch>",
  ])
    assert.throws(() => readMailConfig({ ...smtp, TEST_MAIL_RECIPIENTS }));
  assert.deepEqual(
    readMailConfig({
      ...smtp,
      TEST_MAIL_RECIPIENTS: "nora@studiojeker.ch, martin@studiojeker.ch",
    }).testRecipients,
    ["nora@studiojeker.ch", "martin@studiojeker.ch"],
  );
});
