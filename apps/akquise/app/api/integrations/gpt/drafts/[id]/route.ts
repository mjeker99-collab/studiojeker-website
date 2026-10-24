import { timingSafeEqual } from "node:crypto";
import { requireGptConnector, requireGptWrite } from "@/lib/gpt-connector/auth";
import {
  assertDraftBodySize,
  getDraft,
  updateDraft,
} from "@/lib/gpt-connector/drafts";
import { gptError, gptJson } from "@/lib/gpt-connector/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearerMatches(expected: string, actual: string) {
  return (
    Boolean(expected) &&
    Buffer.byteLength(expected) === Buffer.byteLength(actual) &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(actual))
  );
}

async function authorizeDraftRead(req: Request) {
  const actual =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const writeToken = process.env.CHATGPT_CONNECTOR_WRITE_TOKEN ?? "";
  if (bearerMatches(writeToken, actual)) {
    await requireGptWrite(req);
    return;
  }
  await requireGptConnector(req, "content");
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await authorizeDraftRead(req);
    const { id } = await ctx.params;
    return gptJson(await getDraft(id));
  } catch (error) {
    return gptError(error);
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { actorId } = await requireGptWrite(req);
    const { id } = await ctx.params;
    const rawText = await req.text();
    assertDraftBodySize(req, rawText);
    let body: unknown;
    try {
      body = rawText ? JSON.parse(rawText) : {};
    } catch {
      return gptJson({ error: "Ungültige Anfrage." }, 400);
    }
    const ifMatch = req.headers.get("if-match");
    return gptJson(await updateDraft(actorId, id, body, ifMatch));
  } catch (error) {
    return gptError(error);
  }
}
