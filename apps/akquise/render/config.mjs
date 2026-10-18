import { appOrigin, validateProduction } from "../lib/config.mjs";

// Render supplies the generated HTTPS origin. Never derive it from request headers.
export function configureRender(env = process.env) {
  env.NODE_ENV = "production";
  env.APP_URL ||= env.RENDER_EXTERNAL_URL;
  if (!["disabled", "test", "production"].includes(env.MAIL_MODE))
    throw new Error("Render benötigt einen expliziten Versandmodus.");
  if (
    env.MAIL_MODE === "disabled" &&
    (env.ENABLE_EMAIL_SENDING !== "false" ||
      env.SMTP_CONFIGURATION_CONFIRMED !== "false")
  )
    throw new Error(
      "Deaktivierter Render-Versand benötigt beide Schalter auf false.",
    );
  // validateProduction checks every SMTP field before the process can start.
  // Explicit test/production modes remain subject to message-level approvals.
  validateProduction(env);
  env.APP_URL = appOrigin(env);
  return env;
}
