import { readFileSync } from "node:fs";
// Both the isolated review harness and CI seed supply synthetic accounts.
// Never fall back to a real application account or a shared password.
export function browserCredentials(
  env: Record<string, string | undefined> = process.env,
  readAccess: () => string = () =>
    readFileSync(".local/demo-access.txt", "utf8"),
) {
  let email = env.E2E_EMAIL,
    password = env.E2E_PASSWORD;
  if (!!email !== !!password)
    throw new Error(
      "E2E_EMAIL und E2E_PASSWORD müssen gemeinsam gesetzt sein.",
    );
  if (!email) {
    const match = readAccess().match(
      /Lokales synthetisches Konto: (\S+)\s+Einmaliges Passwort: (\S+)/,
    );
    if (!match) throw new Error("Synthetischer CI-Testzugang fehlt.");
    [, email, password] = match;
  }
  if (!email.endsWith("@example.test") || !password)
    throw new Error("Nur synthetische Browser-Testkonten erlaubt.");
  return { email, password };
}
