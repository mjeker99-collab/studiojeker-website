import { PolicyError } from "../policy";

const CREDENTIAL_QUERY = new Set([
  "token",
  "access_token",
  "api_key",
  "apikey",
  "key",
  "authorization",
  "auth",
  "bearer",
  "secret",
  "password",
]);

/** Rejects credentials in the URL before any upstream call. The value is never copied into the error. */
export function assertNoCredentialQuery(req: Request) {
  let url: URL;
  try {
    url = new URL(req.url);
  } catch {
    throw new PolicyError("Ungültige Anfrage.", 400);
  }
  for (const name of url.searchParams.keys()) {
    if (CREDENTIAL_QUERY.has(name.toLowerCase()))
      throw new PolicyError(
        "Anmeldeinformationen gehören nicht in die Adresse.",
        401,
      );
  }
}
