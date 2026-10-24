import { test } from "node:test";
import assert from "node:assert/strict";
import { configureRender } from "./config.mjs";
const environment = () => ({
  DATABASE_URL:
    "postgresql://akquise:synthetic-long-password-12345@private-db/akquise",
  RENDER_EXTERNAL_URL: "https://synthetic-akquise.onrender.com",
  MARTIN_EMAIL: "martin@studiojeker.ch",
  NORA_EMAIL: "nora@studiojeker.ch",
  MAIL_MODE: "disabled",
  ENABLE_EMAIL_SENDING: "false",
  SMTP_CONFIGURATION_CONFIRMED: "false",
});
test("Render uses generated HTTPS origin and production sessions", () => {
  const env = configureRender(environment());
  assert.equal(env.APP_URL, env.RENDER_EXTERNAL_URL);
  assert.equal(env.NODE_ENV, "production");
});
test("explicit canonical origin overrides generated hostname", () => {
  assert.equal(
    configureRender({
      ...environment(),
      APP_URL: "https://akquise.studiojeker.ch",
    }).APP_URL,
    "https://akquise.studiojeker.ch",
  );
});
const smtp = () => ({
  ...environment(),
  MAIL_MODE: "test",
  ENABLE_EMAIL_SENDING: "true",
  SMTP_CONFIGURATION_CONFIRMED: "true",
  SMTP_HOST: "jovinus.metanet.ch",
  SMTP_PORT: "587",
  SMTP_SECURE: "false",
  SMTP_USER: "njeker@studiojeker.ch",
  SMTP_PASSWORD: "synthetic-not-a-real-secret",
  MAIL_FROM: "njeker@studiojeker.ch",
  TEST_MAIL_RECIPIENTS: "nora@studiojeker.ch",
});
test("Render accepts only a fully configured Metanet test or production mode", () => {
  assert.equal(configureRender(smtp()).MAIL_MODE, "test");
  assert.equal(
    configureRender({ ...smtp(), MAIL_MODE: "production" }).MAIL_MODE,
    "production",
  );
  for (const patch of [
    { MAIL_MODE: "local" },
    { ENABLE_EMAIL_SENDING: "true" },
    { SMTP_CONFIGURATION_CONFIRMED: "true" },
  ])
    assert.throws(() => configureRender({ ...environment(), ...patch }));
  for (const patch of [
    { SMTP_PASSWORD: "" },
    { SMTP_HOST: "other.example.org" },
    { SMTP_SECURE: "" },
    { SMTP_PORT: "" },
    { MAIL_FROM: "other@studiojeker.ch" },
    { TEST_MAIL_RECIPIENTS: "external@example.org" },
  ])
    assert.throws(() => configureRender({ ...smtp(), ...patch }));
});
test("missing/HTTP origins, demo accounts and weak DB credentials fail closed", () => {
  for (const patch of [
    { RENDER_EXTERNAL_URL: undefined },
    { RENDER_EXTERNAL_URL: "http://localhost:3100" },
    { MARTIN_EMAIL: "martin@example.test" },
    { NORA_EMAIL: "martin@studiojeker.ch" },
    { DATABASE_URL: "postgresql://user:password@db/akquise" },
    { ALLOW_SYNTHETIC_SEED: "true" },
  ])
    assert.throws(() => configureRender({ ...environment(), ...patch }));
});
