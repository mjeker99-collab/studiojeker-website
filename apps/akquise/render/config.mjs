import { appOrigin, validateProduction } from "../lib/config.mjs";

// Render supplies the generated HTTPS origin. Never derive it from request headers.
export function configureRender(env = process.env) {
  env.NODE_ENV = "production";
  env.APP_URL ||= env.RENDER_EXTERNAL_URL;
  if (
    env.MAIL_MODE !== "disabled" ||
    env.ENABLE_EMAIL_SENDING !== "false" ||
    env.SMTP_CONFIGURATION_CONFIRMED !== "false"
  )
    throw new Error(
      "Render V1 erlaubt ausschliesslich deaktivierten E-Mail-Versand.",
    );
  if (env.SMTP_PASSWORD)
    throw new Error("Render V1 darf kein SMTP-Passwort enthalten.");
  validateProduction(env);
  env.APP_URL = appOrigin(env);
  return env;
}
