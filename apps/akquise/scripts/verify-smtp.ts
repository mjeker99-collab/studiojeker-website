import { configureRender } from "../render/config.mjs";
import { createMetanetTransport } from "../lib/mail";

// Authenticate and negotiate TLS without sending a message or changing delivery state.
let transport: ReturnType<typeof createMetanetTransport> | undefined;
try {
  configureRender();
  if (process.env.MAIL_MODE !== "test")
    throw new Error("SMTP-Prüfung ist nur im internen Testmodus erlaubt.");
  transport = createMetanetTransport();
  await transport.verify();
  console.log(
    "Metanet SMTP: TLS und Anmeldung erfolgreich; keine Mail gesendet.",
  );
} catch (error) {
  // Never print SMTP errors: providers can echo usernames or credentials.
  console.error(
    "Metanet SMTP-Prüfung fehlgeschlagen:",
    error instanceof Error ? error.name : "UnknownError",
  );
  process.exitCode = 1;
} finally {
  transport?.close();
}
