import { requireGptWrite } from "@/lib/gpt-connector/auth";
import { gptError, gptJson } from "@/lib/gpt-connector/http";
import { PolicyError } from "@/lib/policy";
import { siteCmsRequestReview, siteCmsPublish } from "@/lib/site-cms/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ key: string }> };

async function parsePayload(req: Request, key: string) {
  const raw = await req.text();
  if (Buffer.byteLength(raw) > 8_000)
    throw new PolicyError("Anfrage zu gross.", 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { throw new PolicyError("Ungültiges JSON.", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new PolicyError("Ungültige Anfrage.", 400);
  const payload = body as Record<string, unknown>;
  if (payload.pageKey !== undefined && payload.pageKey !== key)
    throw new PolicyError("Seitenkennung stimmt nicht überein.", 400);
  return { ...payload, pageKey: key };
}

/** Log a review request for the current, revision-checked Sanity draft. */
export async function POST(req: Request, context: RouteContext) {
  try {
    const { actorId } = await requireGptWrite(req);
    const { key } = await context.params;
    return gptJson(await siteCmsRequestReview(actorId, await parsePayload(req, key)));
  } catch (error) {
    return gptError(error);
  }
}
