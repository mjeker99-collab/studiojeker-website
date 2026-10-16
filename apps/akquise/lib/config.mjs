// Shared by the Next.js server and the production entrypoint. Never import in client components.
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const synthetic = (value) =>
  /(^|[.@])(example|test|invalid|localhost)([.@]|$)/i.test(value);
export function flag(value, fallback = false) {
  if (value === undefined || value === "") return fallback;
  if (value !== "true" && value !== "false")
    throw new Error("Boolean-Konfiguration muss true oder false sein.");
  return value === "true";
}
export function appOrigin(env = process.env) {
  const value =
    env.APP_URL ||
    (env.NODE_ENV !== "production" ? "http://localhost:3100" : "");
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("APP_URL fehlt oder ist ungültig.");
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("APP_URL muss ein reiner HTTP(S)-Origin sein.");
  if (
    env.NODE_ENV === "production" &&
    (url.protocol !== "https:" ||
      ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname))
  )
    throw new Error("Produktion benötigt eine eigene HTTPS-Adresse.");
  return url.origin;
}
export function allowedAccount(user, env = process.env) {
  if (env.NODE_ENV !== "production") return true;
  const email =
    user.name === "Martin Jeker"
      ? env.MARTIN_EMAIL
      : user.name === "Nora Jeker"
        ? env.NORA_EMAIL
        : undefined;
  return Boolean(
    email &&
    user.email === email.trim().toLowerCase() &&
    !synthetic(user.email),
  );
}
export function validateProduction(env = process.env) {
  appOrigin(env);
  let database;
  try {
    database = new URL(env.DATABASE_URL || "");
  } catch {
    throw new Error("DATABASE_URL fehlt oder ist ungültig.");
  }
  if (
    !["postgres:", "postgresql:"].includes(database.protocol) ||
    !database.password ||
    decodeURIComponent(database.password).length < 20 ||
    /(local_only_change_me|change_me|changeme|replace_with|^password$)/i.test(
      decodeURIComponent(database.password),
    )
  )
    throw new Error(
      "PostgreSQL benötigt eine individuelle DATABASE_URL mit sicherem Passwort.",
    );
  for (const key of ["MARTIN_EMAIL", "NORA_EMAIL"])
    if (!emailPattern.test(env[key] || "") || synthetic(env[key] || ""))
      throw new Error(`${key}: persönliche reale E-Mail-Adresse erforderlich.`);
  if (
    env.MARTIN_EMAIL.trim().toLowerCase() ===
    env.NORA_EMAIL.trim().toLowerCase()
  )
    throw new Error("Martin und Nora benötigen unterschiedliche Konten.");
  if (flag(env.ALLOW_SYNTHETIC_SEED))
    throw new Error("Demo-Seed ist in Produktion verboten.");
  readMailConfig(env);
}
export function readMailConfig(env = process.env) {
  const mode = env.MAIL_MODE || "disabled";
  if (!["disabled", "local", "test", "production"].includes(mode))
    throw new Error("MAIL_MODE ist ungültig.");
  const enabled = flag(env.ENABLE_EMAIL_SENDING);
  const confirmed = flag(env.SMTP_CONFIGURATION_CONFIRMED);
  const testRecipients = (env.TEST_MAIL_RECIPIENTS || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  const dailyLimit = Number(env.DAILY_SEND_LIMIT || 20);
  if (!Number.isInteger(dailyLimit) || dailyLimit < 1 || dailyLimit > 500)
    throw new Error("DAILY_SEND_LIMIT muss zwischen 1 und 500 liegen.");
  const smtpAllowed =
    enabled && confirmed && ["test", "production"].includes(mode);
  if (enabled && !smtpAllowed)
    throw new Error(
      "Versand benötigt Mailmodus und bestätigte SMTP-Konfiguration.",
    );
  const port = Number(env.SMTP_PORT || 0);
  const secure = flag(env.SMTP_SECURE);
  if (smtpAllowed) {
    if (!["true", "false"].includes(env.SMTP_SECURE || ""))
      throw new Error("SMTP_SECURE muss ausdrücklich bestätigt sein.");
    if (
      env.SMTP_HOST !== "jovinus.metanet.ch" ||
      env.MAIL_FROM !== "njeker@studiojeker.ch" ||
      env.SMTP_USER !== "njeker@studiojeker.ch" ||
      !env.SMTP_PASSWORD ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535
    )
      throw new Error("Metanet SMTP-Konfiguration ist unvollständig.");
    if (
      mode === "test" &&
      (!testRecipients.length ||
        testRecipients.some(
          (v) =>
            !emailPattern.test(v) ||
            v.includes("*") ||
            !v.endsWith("@studiojeker.ch"),
        ))
    )
      throw new Error(
        "Testmodus benötigt festgelegte interne @studiojeker.ch-Empfänger.",
      );
  }
  return { mode, smtpAllowed, port, secure, testRecipients, dailyLimit };
}
export function sessionCookieName(env = process.env) {
  return env.NODE_ENV === "production"
    ? "__Host-akquise-session"
    : "akquise-session";
}
