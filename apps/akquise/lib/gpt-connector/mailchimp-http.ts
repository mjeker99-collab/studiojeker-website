import { NextResponse } from "next/server";
import { PolicyError } from "../policy";
import { requireGptConnector } from "./auth";
import { gptError, gptJson } from "./http";
import { queryFromRequest, readMailchimpLive, type MailchimpLiveSnapshot } from "./mailchimp-live";
import { assertNoCredentialQuery } from "./request-guard";

export type MailchimpReadDeps = {
  authorize?: (req: Request) => Promise<unknown>;
  read?: (query: unknown) => Promise<MailchimpLiveSnapshot>;
};

function unauthorized(message = "Nicht autorisiert.") {
  return new NextResponse(JSON.stringify({ error: message }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "WWW-Authenticate": 'Bearer realm="studioone-gpt"',
    },
  });
}

export function mailchimpHttpError(error: unknown) {
  if (error instanceof PolicyError && error.status === 401) return unauthorized(error.message);
  return gptError(error);
}

/** Authenticated GET. The read token plus the opt-in mailchimp scope. No write token, no URL token. */
export async function handleMailchimpRead(req: Request, deps: MailchimpReadDeps = {}) {
  const authorize = deps.authorize ?? ((r: Request) => requireGptConnector(r, "mailchimp"));
  const read = deps.read ?? readMailchimpLive;
  try {
    assertNoCredentialQuery(req);
    await authorize(req);
    if (req.method !== "GET") throw new PolicyError("Nur Lesen ist erlaubt.", 405);
    return gptJson(await read(queryFromRequest(req)));
  } catch (error) {
    return mailchimpHttpError(error);
  }
}
