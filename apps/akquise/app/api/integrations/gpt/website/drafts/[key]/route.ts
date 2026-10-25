import { requireGptConnector, requireGptWrite } from "@/lib/gpt-connector/auth";
import { gptError, gptJson } from "@/lib/gpt-connector/http";
import { siteCmsPage, siteCmsSaveDraft } from "@/lib/site-cms/service";
import { PolicyError } from "@/lib/policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ key: string }> };

/** Retrieves the current Sanity page and its draft flag/version. */
export async function GET(req: Request, context: RouteContext) {
  try {
    const { actorId } = await requireGptConnector(req, "content");
    if (!actorId) throw new PolicyError("Kein aktiver StudioONE-Akteur konfiguriert.", 503);
    const { key } = await context.params;
    const page = await siteCmsPage(actorId, key);
    return gptJson({ ...page, notice: page.hasDraft ? "Draft vorhanden." : "Kein Draft vorhanden." });
  } catch (error) {
    return gptError(error);
  }
}

/** Updates an existing Sanity draft with revision checking, never publishes. */
export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { actorId } = await requireGptWrite(req);
    const { key } = await context.params;
    const raw = await req.text();
    if (Buffer.byteLength(raw) > 64_000) throw new PolicyError("Anfrage zu gross.", 413);
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return gptJson({ error: "Ungültiges JSON." }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new PolicyError("Ungültige Anfrage.", 400);
    const payload = body as Record<string, unknown>;
    if (payload.pageKey !== undefined && payload.pageKey !== key)
      throw new PolicyError("Seitenkennung stimmt nicht überein.", 400);
    const current = await siteCmsPage(actorId, key);
    if (!current.hasDraft) throw new PolicyError("Kein bestehender Entwurf.", 404);
    return gptJson(await siteCmsSaveDraft(actorId, { ...payload, pageKey: key }));
  } catch (error) {
    return gptError(error);
  }
}
